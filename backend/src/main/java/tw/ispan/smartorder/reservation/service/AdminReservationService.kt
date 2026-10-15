package tw.ispan.smartorder.reservation.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tw.ispan.smartorder.common.exception.ApiException
import tw.ispan.smartorder.reservation.config.ReservationProperties
import tw.ispan.smartorder.reservation.dto.response.AdminReservationResponse
import tw.ispan.smartorder.reservation.dto.response.AvailableTableResponse
import tw.ispan.smartorder.reservation.dto.response.CancelReservationResponse
import tw.ispan.smartorder.reservation.dto.response.HeldForResponse
import tw.ispan.smartorder.reservation.dto.response.OpenOptionsResponse
import tw.ispan.smartorder.reservation.dto.response.OpenReservationItem
import tw.ispan.smartorder.reservation.dto.response.OpenWaitlistItem
import tw.ispan.smartorder.reservation.dto.response.UpcomingReservationResponse
import tw.ispan.smartorder.reservation.dto.response.SeatReservationResponse
import tw.ispan.smartorder.entity.DiningSessionEntity
import tw.ispan.smartorder.entity.ReservationEntity
import tw.ispan.smartorder.reservation.enums.CancelSource
import tw.ispan.smartorder.reservation.enums.ReservationStatus
import tw.ispan.smartorder.repository.DiningSessionRepository
import tw.ispan.smartorder.reservation.repository.ReservationRepository
import tw.ispan.smartorder.repository.DiningTableRepository
import tw.ispan.smartorder.staff.repository.StaffRepository
import tw.ispan.smartorder.staff.security.StaffPrincipal
import java.security.SecureRandom
import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Duration
import java.time.format.DateTimeFormatter

// S-07 預約管理：櫃檯看一天的訂位、代客取消、報到開桌（S-07b）
@Service
class AdminReservationService(
    private val reservationRepo: ReservationRepository,
    private val tableRepo: DiningTableRepository,
    private val sessionRepo: DiningSessionRepository,
    private val staffRepo: StaffRepository,
    private val holdService: TableHoldService,
    private val properties: ReservationProperties,
    private val clock: Clock,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional(readOnly = true)
    fun list(date: LocalDate): List<AdminReservationResponse> {
        val reservations = reservationRepo.findByStartTimeGreaterThanEqualAndStartTimeLessThanOrderByStartTimeAscIdAsc(
            date.atStartOfDay(),
            date.plusDays(1).atStartOfDay(),
        )
        if (reservations.isEmpty()) return emptyList()

        val tableNos = tableRepo.findAllById(reservations.mapNotNull { it.tableId }.toSet())
            .associate { it.id to it.tableNo }
        val seatedTableNos = reservationRepo.findSeatedTables(reservations.map { it.id!! })
            .associate { it.getReservationId() to it.getTableNo() }
        val staffNames = staffRepo.findAllById(reservations.mapNotNull { it.cancelledByStaffId }.toSet())
            .associate { it.id to it.displayName }
        val now = LocalDateTime.now(clock)

        return reservations.map {
            toAdminResponse(it, tableNos[it.tableId], seatedTableNos[it.id], staffNames[it.cancelledByStaffId], now)
        }
    }

    // 櫃檯代客取消：隨時可以取消，不受客人那邊「訂位前 30 分」的期限
    @Transactional
    fun cancelByStaff(id: Long, staff: StaffPrincipal, reason: String?): CancelReservationResponse {
        // 先鎖住再檢查狀態，兩個櫃檯同時按或剛好在報到，後到的會看到已經不是 CONFIRMED
        val reservation = reservationRepo.findByIdForUpdate(id) ?: throw ApiException.notFound("找不到這筆訂位")
        if (reservation.status != ReservationStatus.CONFIRMED) {
            throw ApiException.conflict("RESERVATION_NOT_CANCELLABLE", "這筆訂位已經不能取消了")
        }
        reservation.cancel(CancelSource.STAFF, staff.id, LocalDateTime.now(clock))
        log.info("櫃檯代客取消訂位 {}，員工 {}（{}），原因：{}", reservation.reservationNo, staff.displayName, staff.id, reason ?: "未填")

        return CancelReservationResponse(
            reservationId = reservation.id!!,
            status = reservation.status,
            cancelSource = CancelSource.STAFF,
            cancelledAt = properties.toOffset(reservation.cancelledAt!!),
            cancelledByStaffName = staff.displayName,
        )
    }

    // S-07b 選桌：空桌且坐得下；保留給別筆訂位的不列，自己的原保留桌排第一，
    // 115 分鐘內有別筆訂位的排在沒衝突的後面
    @Transactional(readOnly = true)
    fun availableTables(partySize: Int, reservationId: Long?): List<AvailableTableResponse> {
        if (partySize < 1) throw ApiException.badRequest("人數至少 1 位")
        val holds = holdService.snapshot(LocalDateTime.now(clock))
        val excludeIds = setOfNotNull(reservationId)

        return tableRepo.findAvailable(partySize).mapNotNull { table ->
            val holder = holds.heldBy(table.id!!)
            val isOwnHold = holder != null && holder.id == reservationId
            if (holder != null && !isOwnHold) return@mapNotNull null
            AvailableTableResponse(
                tableId = table.id!!,
                tableNo = table.tableNo!!,
                area = table.area!!,
                seats = table.seats,
                upcomingReservationAt = holds.upcoming(table.id!!, excludeIds)?.startTime?.format(HH_MM),
                isOwnHold = isOwnHold,
            )
        }.sortedWith(
            compareByDescending<AvailableTableResponse> { it.isOwnHold }
                .thenBy { it.upcomingReservationAt != null }
                .thenBy { it.seats }
                .thenBy { it.tableNo },
        )
    }

    // S-02 點空桌進開桌頁：可報到的預約、已叫號的候位、這張桌的保留與稍後的訂位
    @Transactional(readOnly = true)
    fun openOptions(tableId: Long): OpenOptionsResponse {
        val table = tableRepo.findById(tableId).orElse(null)?.takeIf { it.active }
            ?: throw ApiException.notFound("找不到這張桌")
        val now = LocalDateTime.now(clock)
        val holds = holdService.snapshot(now)

        // −10 是保留時間的尾巴、+30 是最早可報到；清單自己看時間，不等 NO_SHOW 排程
        val reservations = reservationRepo
            .findByStatusAndStartTimeGreaterThanEqualAndStartTimeLessThanEqualAndPartySizeLessThanEqualOrderByStartTimeAsc(
                ReservationStatus.CONFIRMED,
                now.minusMinutes(properties.holdAfterMinutes),
                now.plusMinutes(properties.holdBeforeMinutes),
                table.seats,
            )
        val assignedTableNos = tableRepo.findAllById(reservations.mapNotNull { it.tableId }.toSet())
            .associate { it.id to it.tableNo }
        // 用餐中、待清理的桌不顯示保留，客人到了從 S-07b 另選一張
        val holder = if (table.status == TABLE_AVAILABLE) holds.heldBy(tableId) else null
        val upcoming = holds.upcoming(tableId, setOfNotNull(holder?.id))

        return OpenOptionsResponse(
            tableId = tableId,
            tableNo = table.tableNo!!,
            seats = table.seats,
            area = table.area!!,
            status = table.status!!,
            waitlist = reservationRepo.findCalledWaitlist(table.seats).map {
                OpenWaitlistItem(
                    id = it.getId(),
                    no = it.getTicketNo(),
                    name = it.getContactName(),
                    partySize = it.getPartySize(),
                    waitedMinutes = Duration.between(it.getCreatedAt(), now).toMinutes(),
                    status = "CALLED",
                )
            },
            reservations = reservations.map {
                OpenReservationItem(
                    id = it.id!!,
                    reservationNo = it.reservationNo ?: "",
                    name = it.contactName!!,
                    phoneMasked = maskPhone(it.contactPhone!!),
                    startTime = properties.toOffset(it.startTime!!),
                    adultCount = it.adultCount,
                    childCount = it.childCount,
                    partySize = it.partySize,
                    preorderItemCount = 0,
                    assignedTableNo = assignedTableNos[it.tableId],
                )
            },
            heldFor = holder?.let {
                HeldForResponse(it.id!!, it.reservationNo ?: "", it.contactName!!, it.partySize, properties.toOffset(it.startTime!!))
            },
            upcomingOnThisTable = upcoming?.let {
                UpcomingReservationResponse(
                    reservationNo = it.reservationNo ?: "",
                    name = it.contactName!!,
                    startTime = properties.toOffset(it.startTime!!),
                    endTime = properties.toOffset(it.endTime!!),
                    partySize = it.partySize,
                )
            },
        )
    }

    // 0933123210 → 0933***210
    private fun maskPhone(phone: String): String =
        if (phone.length < 7) phone else phone.take(4) + "***" + phone.takeLast(3)

    // 報到開桌：鎖訂位 → 檢查狀態與報到時間窗 → 鎖桌 → 檢查空桌與保留 → 建立用餐紀錄。
    // 鎖的順序固定是「訂位再桌位」，跟取消、現場開桌搶同一筆時不會互相卡死
    @Transactional
    fun seat(id: Long, tableId: Long): SeatReservationResponse {
        val reservation = reservationRepo.findByIdForUpdate(id) ?: throw ApiException.notFound("找不到這筆訂位")
        if (reservation.status != ReservationStatus.CONFIRMED) {
            throw ApiException.conflict("RESERVATION_NOT_ACTIVE", "這筆訂位已經取消或已報到")
        }

        // 不能等 NO_SHOW 排程，報到這裡自己看時間
        val now = LocalDateTime.now(clock)
        val start = reservation.startTime!!
        val checkInFrom = start.minusMinutes(properties.holdBeforeMinutes)
        if (now < checkInFrom) {
            throw ApiException.conflict("RESERVATION_TOO_EARLY", "還沒到可報到時間（${checkInFrom.format(HH_MM)} 起）")
        }
        if (now > start.plusMinutes(properties.holdAfterMinutes)) {
            throw ApiException.conflict("RESERVATION_EXPIRED", "已超過保留時間，請改登記候位")
        }

        val table = tableRepo.findByIdForUpdate(tableId).orElse(null) ?: throw ApiException.notFound("找不到這張桌")
        if (table.status != TABLE_AVAILABLE) {
            throw ApiException.conflict("TABLE_OCCUPIED", "${table.tableNo} 使用中，請換一張桌")
        }
        if (table.seats < reservation.partySize) {
            throw ApiException.badRequest("${table.tableNo} 坐不下 ${reservation.partySize} 位")
        }
        // 鎖住桌位之後再算一次保留，不相信畫面上的狀態；自己的保留桌照常開
        val holder = holdService.snapshot(now).heldBy(tableId)
        if (holder != null && holder.id != reservation.id) {
            throw ApiException.conflict(
                "TABLE_RESERVED",
                "這張桌保留給 ${holder.contactName} ${holder.startTime!!.format(HH_MM)}，客人來電取消的話請到預約管理取消訂位",
            )
        }

        val session = sessionRepo.save(
            DiningSessionEntity().apply {
                this.tableId = tableId
                reservationId = reservation.id
                sessionToken = newSessionToken()
                adultCount = reservation.adultCount
                childCount = reservation.childCount
                openedAt = now
            }
        )
        table.status = TABLE_OCCUPIED
        // 不改 table_id：那是訂位當下配的桌，實際坐哪張記在用餐紀錄
        reservation.status = ReservationStatus.SEATED

        return SeatReservationResponse(
            diningSessionId = session.id!!,
            tableNo = table.tableNo!!,
            adultCount = reservation.adultCount,
            childCount = reservation.childCount,
            preorderTicketId = null,
            soldOut = emptyList(),
        )
    }

    private fun newSessionToken(): String {
        val bytes = ByteArray(16)
        random.nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun toAdminResponse(
        reservation: ReservationEntity,
        assignedTableNo: String?,
        seatedTableNo: String?,
        cancelledByStaffName: String?,
        now: LocalDateTime,
    ): AdminReservationResponse {
        val start = reservation.startTime!!
        val checkInFrom = start.minusMinutes(properties.holdBeforeMinutes)
        val checkInUntil = start.plusMinutes(properties.holdAfterMinutes)
        return AdminReservationResponse(
            reservationId = reservation.id!!,
            reservationNo = reservation.reservationNo ?: "",
            startTime = properties.toOffset(start),
            endTime = properties.toOffset(reservation.endTime!!),
            contactName = reservation.contactName!!,
            contactPhone = reservation.contactPhone!!,
            member = reservation.memberId != null,
            adultCount = reservation.adultCount,
            childCount = reservation.childCount,
            partySize = reservation.partySize,
            assignedTableNo = assignedTableNo,
            seatedTableNo = seatedTableNo,
            status = reservation.status,
            holding = reservation.status == ReservationStatus.CONFIRMED && reservation.tableId != null &&
                now >= checkInFrom && now <= checkInUntil,
            checkInFrom = properties.toOffset(checkInFrom),
            checkInUntil = properties.toOffset(checkInUntil),
            cancelSource = reservation.cancelSource,
            cancelledAt = reservation.cancelledAt?.let { properties.toOffset(it) },
            cancelledByStaffName = cancelledByStaffName,
            preorderItemCount = 0,
        )
    }

    companion object {
        private val HH_MM = DateTimeFormatter.ofPattern("HH:mm")
        private const val TABLE_AVAILABLE = "AVAILABLE"
        private const val TABLE_OCCUPIED = "OCCUPIED"
        private val random = SecureRandom()
    }
}
