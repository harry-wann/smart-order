package tw.ispan.smartorder.reservation.service

import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tw.ispan.smartorder.reservation.config.ReservationProperties
import tw.ispan.smartorder.reservation.dto.request.CreateReservationRequest
import tw.ispan.smartorder.reservation.dto.response.AvailabilityResponse
import tw.ispan.smartorder.reservation.dto.response.CancelReservationResponse
import tw.ispan.smartorder.reservation.dto.response.ReservationCreatedResponse
import tw.ispan.smartorder.reservation.dto.response.ReservationDetailResponse
import tw.ispan.smartorder.reservation.dto.response.SlotResponse
import tw.ispan.smartorder.entity.DiningTableEntity
import tw.ispan.smartorder.reservation.entity.ReservationEntity
import tw.ispan.smartorder.common.exception.ApiException
import tw.ispan.smartorder.reservation.repository.ReservationRepository
import tw.ispan.smartorder.reservation.enums.CancelSource
import tw.ispan.smartorder.reservation.enums.ReservationStatus
import tw.ispan.smartorder.reservation.repository.ReservationTableRepository
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

@Service
class ReservationService(
    private val reservationRepo: ReservationRepository,
    private val tableRepo: ReservationTableRepository,
    private val properties: ReservationProperties,
    private val clock: Clock,
) {

    @Transactional(readOnly = true)
    fun availability(date: LocalDate, partySize: Int): AvailabilityResponse {
        checkBookableDate(date)
        if (partySize < 1) throw ApiException.badRequest("人數至少 1 位")

        val tables = tableRepo.findReservable(partySize)
        val slotStarts = slotTimes().map { date.atTime(it) }
        val occupying = findOccupying(tables, slotStarts.first(), slotStarts.last().plusMinutes(properties.occupyMinutes))

        val slots = slotStarts.map { start ->
            val end = start.plusMinutes(properties.occupyMinutes)
            val busyTableIds = occupying
                .filter { it.startTime!! < end && it.endTime!! > start }
                .mapNotNull { it.tableId }
                .toSet()
            val remaining = tables.count { it.id !in busyTableIds }
            SlotResponse(start.toLocalTime().format(HH_MM), remaining > 0, remaining)
        }
        return AvailabilityResponse(date, properties.diningMinutes, properties.bufferMinutes, slots)
    }

    @Transactional
    fun create(request: CreateReservationRequest, memberId: Long?): ReservationCreatedResponse {
        val start = request.startTime!!.atZoneSameInstant(properties.zone).toLocalDateTime()
        checkBookableDate(start.toLocalDate())
        checkSlot(start)

        val adultCount = request.adultCount!!
        val childCount = request.childCount ?: 0
        val partySize = adultCount + childCount
        val end = start.plusMinutes(properties.occupyMinutes)

        // 鎖住所有坐得下的桌之後才查重疊，同時送出的另一筆會在這裡排隊
        val candidates = tableRepo.findReservableForUpdate(partySize)
        val busyTableIds = findOccupying(candidates, start, end).mapNotNull { it.tableId }.toSet()
        // best-fit：坐得下的桌裡挑座位最少的，大桌留給大團
        val table = candidates
            .filter { it.id !in busyTableIds }
            .minWithOrNull(compareBy<DiningTableEntity>({ it.seats }, { it.tableNo }))
            ?: throw ApiException.conflict("SLOT_UNAVAILABLE", "這個時段已經客滿了，請改選其他時段")

        val reservation = ReservationEntity(
            memberId = memberId,
            startTime = start,
            endTime = end,
            adultCount = adultCount,
            childCount = childCount,
            partySize = partySize,
            tableId = table.id,
            accessToken = newAccessToken(),
        )
        fillContact(reservation, request, memberId)

        try {
            reservationRepo.saveAndFlush(reservation)
        } catch (e: DataIntegrityViolationException) {
            // UNIQUE(table_id, start_time) 是鎖之外的最後一道保險；其他資料錯誤照常往外丟
            if (e.mostSpecificCause.message?.contains(UNIQUE_TABLE_START) != true) throw e
            throw ApiException.conflict("SLOT_UNAVAILABLE", "這個時段剛好被訂走了，請改選其他時段")
        }
        // 流水號就是 id，不足 4 碼補 0（跟 seed 的 LPAD 一樣），超過也不截斷
        reservation.reservationNo = "R-%s-%04d".format(start.format(YYMMDD), reservation.id!!)

        return toCreatedResponse(reservation, table)
    }

    @Transactional(readOnly = true)
    fun detail(id: Long, accessToken: String?, memberId: Long?): ReservationDetailResponse {
        val reservation = checkAccess(reservationRepo.findById(id).orElse(null), accessToken, memberId)
        val table = reservation.tableId?.let { tableRepo.findById(it).orElse(null) }
        return toDetailResponse(reservation, table)
    }

    @Transactional(readOnly = true)
    fun memberReservations(memberId: Long?): List<ReservationDetailResponse> {
        if (memberId == null) throw ApiException.unauthorized("請先登入會員")
        val reservations = reservationRepo.findByMemberIdOrderByStartTimeDesc(memberId)
        val tables = tableRepo.findAllById(reservations.mapNotNull { it.tableId }.toSet()).associateBy { it.id }
        return reservations.map { toDetailResponse(it, tables[it.tableId]) }
    }

    // 客人線上取消：期限是訂位前 30 分，也就是預約保留開始的時間；之後只能請櫃檯代取消
    @Transactional
    fun cancelByCustomer(id: Long, accessToken: String?, memberId: Long?): CancelReservationResponse {
        val reservation = checkAccess(reservationRepo.findByIdForUpdate(id), accessToken, memberId)
        if (reservation.status != ReservationStatus.CONFIRMED) {
            throw ApiException.conflict("RESERVATION_NOT_CANCELLABLE", "這筆訂位已經不能取消了")
        }
        val deadline = reservation.startTime!!.minusMinutes(properties.holdBeforeMinutes)
        if (LocalDateTime.now(clock) >= deadline) {
            throw ApiException.conflict("CANCEL_DEADLINE_PASSED", "訂位前 30 分鐘內請來電取消")
        }
        reservation.cancel(CancelSource.CUSTOMER, null, LocalDateTime.now(clock))
        return CancelReservationResponse(
            reservation.id!!, reservation.status, CancelSource.CUSTOMER, toOffset(reservation.cancelledAt!!),
        )
    }

    // 會員看自己的、匿名憑訂位時拿到的 accessToken；只憑 id 不能動別人的訂位
    private fun checkAccess(reservation: ReservationEntity?, accessToken: String?, memberId: Long?): ReservationEntity {
        if (accessToken.isNullOrBlank() && memberId == null) {
            throw ApiException.unauthorized("請登入會員，或用訂位時的這支手機查詢")
        }
        val allowed = reservation != null &&
            ((memberId != null && reservation.memberId == memberId) || sameToken(reservation.accessToken, accessToken))
        // 不是自己的也回 404，不讓人用猜 id 的方式確認訂位存不存在
        if (!allowed) throw ApiException.notFound("找不到這筆訂位")
        return reservation!!
    }

    private fun sameToken(expected: String?, actual: String?): Boolean {
        if (expected == null || actual.isNullOrBlank()) return false
        return MessageDigest.isEqual(expected.toByteArray(), actual.toByteArray())
    }

    private fun toDetailResponse(reservation: ReservationEntity, table: DiningTableEntity?): ReservationDetailResponse {
        val start = reservation.startTime!!
        val cancellableUntil = start.minusMinutes(properties.holdBeforeMinutes)
        return ReservationDetailResponse(
            reservationId = reservation.id!!,
            reservationNo = reservation.reservationNo!!,
            status = reservation.status,
            startTime = toOffset(start),
            endTime = toOffset(reservation.endTime!!),
            adultCount = reservation.adultCount,
            childCount = reservation.childCount,
            partySize = reservation.partySize,
            tableNo = table?.tableNo,
            seats = table?.seats,
            area = table?.area,
            contactName = reservation.contactName!!,
            member = reservation.memberId != null,
            cancellableUntil = toOffset(cancellableUntil),
            cancellable = reservation.status == ReservationStatus.CONFIRMED && LocalDateTime.now(clock) < cancellableUntil,
            cancelSource = reservation.cancelSource,
            cancelledAt = reservation.cancelledAt?.let { toOffset(it) },
            hasPreorder = false,
        )
    }

    private fun fillContact(reservation: ReservationEntity, request: CreateReservationRequest, memberId: Long?) {
        if (memberId != null) {
            val member = reservationRepo.findMemberContact(memberId)
                ?: throw ApiException.unauthorized("會員身分無效，請重新登入")
            reservation.contactName = request.contactName?.takeIf { it.isNotBlank() } ?: member.getNickname() ?: "會員"
            reservation.contactPhone = member.getPhone()
            reservation.contactEmail = request.contactEmail?.takeIf { it.isNotBlank() }
            return
        }

        val name = request.contactName?.trim()
        val phone = request.contactPhone
        if (name.isNullOrEmpty() || phone.isNullOrEmpty()) {
            throw ApiException.badRequest("請填寫姓名與手機號碼")
        }
        reservation.contactName = name
        reservation.contactPhone = phone
        reservation.contactEmail = request.contactEmail?.takeIf { it.isNotBlank() }
    }

    private fun findOccupying(tables: List<DiningTableEntity>, from: LocalDateTime, to: LocalDateTime) =
        if (tables.isEmpty()) emptyList()
        else reservationRepo.findOccupying(tables.mapNotNull { it.id }, from, to)

    // 線上只接明天起 N 天內，當天不接
    private fun checkBookableDate(date: LocalDate) {
        val today = LocalDate.now(clock)
        if (date <= today || date > today.plusDays(properties.bookableDays)) {
            throw ApiException.badRequest("只能訂明天起 ${properties.bookableDays} 天內")
        }
    }

    private fun checkSlot(start: LocalDateTime) {
        if (start.toLocalTime() !in slotTimes()) {
            throw ApiException.badRequest("請選擇營業時段內的整點或半點")
        }
    }

    private fun slotTimes(): List<LocalTime> {
        return generateSequence(properties.firstSlot) { it.plusMinutes(properties.slotMinutes) }
            .takeWhile { it <= properties.lastSlot }
            .toList()
    }

    private fun toCreatedResponse(reservation: ReservationEntity, table: DiningTableEntity): ReservationCreatedResponse {
        val start = reservation.startTime!!
        return ReservationCreatedResponse(
            reservationId = reservation.id!!,
            reservationNo = reservation.reservationNo!!,
            accessToken = reservation.accessToken!!,
            tableNo = table.tableNo!!,
            seats = table.seats,
            startTime = toOffset(start),
            endTime = toOffset(reservation.endTime!!),
            status = reservation.status,
            cancellableUntil = toOffset(start.minusMinutes(properties.holdBeforeMinutes)),
            // 預點（進階）截止是用餐前一天 20:00，跟取消期限是兩條線
            preorderEditableUntil = toOffset(start.toLocalDate().minusDays(1).atTime(PREORDER_DEADLINE)),
            hasPreorder = false,
        )
    }

    private fun toOffset(time: LocalDateTime): OffsetDateTime = properties.toOffset(time)

    private fun newAccessToken(): String {
        val bytes = ByteArray(24)
        random.nextBytes(bytes)
        return "rsv_" + bytes.joinToString("") { "%02x".format(it) }
    }

    companion object {
        private val HH_MM = DateTimeFormatter.ofPattern("HH:mm")
        private val YYMMDD = DateTimeFormatter.ofPattern("yyMMdd")
        private const val UNIQUE_TABLE_START = "uk_reservation_table_start"
        private val PREORDER_DEADLINE = LocalTime.of(20, 0)
        private val random = SecureRandom()
    }
}
