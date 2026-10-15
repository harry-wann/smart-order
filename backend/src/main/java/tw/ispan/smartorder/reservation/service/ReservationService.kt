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
import tw.ispan.smartorder.entity.ReservationEntity
import tw.ispan.smartorder.common.exception.ApiException
import tw.ispan.smartorder.reservation.repository.ReservationRepository
import tw.ispan.smartorder.reservation.enums.CancelSource
import tw.ispan.smartorder.reservation.enums.ReservationStatus
import tw.ispan.smartorder.repository.DiningTableRepository
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

// 訂位佔一張桌的長度是 occupyMinutes（用餐 100 + 清桌 15 = 115 分），清桌時間直接算進 end_time，
// 所以重疊判斷只比 start / end，不用另外處理緩衝（M7 問題 2）。
// 資料庫存的是店家時區的 LocalDateTime，「現在」只從 clock 拿，不碰伺服器時區。
@Service
class ReservationService(
    private val reservationRepo: ReservationRepository,
    private val tableRepo: DiningTableRepository,
    private val properties: ReservationProperties,
    private val clock: Clock,
) {

    // 只是給客人看的剩餘桌數，沒有上鎖；按下確認時 create() 會在鎖裡重算一次，
    // 所以這裡顯示有位、送出卻客滿是可能發生的
    @Transactional(readOnly = true)
    fun availability(date: LocalDate, partySize: Int): AvailabilityResponse {
        checkBookableDate(date)
        if (partySize < 1) throw ApiException.badRequest("人數至少 1 位")

        val tables = tableRepo.findReservable(partySize)
        val slotStarts = slotTimes().map { date.atTime(it) }
        // 整天的訂位一次查完，每個時段再在記憶體裡用同一條 start < 時段結束 且 end > 時段開始 過濾，
        // 不要每一格各查一次資料庫
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

    // 建立訂位，順序不能亂：
    // 1. 先 FOR UPDATE 鎖住所有坐得下的候選桌。要先知道誰被佔用才挑得出桌，
    //    挑完才鎖單一張的話中間又會被插隊，乾脆整組鎖住再算。代價是同時訂位的人要排隊，桌數不多，可以接受
    // 2. 在鎖裡才查重疊，排除佔用的桌後挑座位最少的（best-fit）。順序反過來（先查再鎖），
    //    拿到鎖時查到的結果已經過期，兩個人會挑到同一張桌
    // 3. saveAndFlush 馬上 insert。UNIQUE(table_id, start_time) 只擋 start 完全一樣的，
    //    18:00 和 19:00 訂同一桌它擋不住，重疊要靠上面那把鎖；它是鎖之外的最後一道保險
    // 4. insert 拿到 id 才組得出 reservationNo，同一個交易裡補上，commit 時 update 進去
    // 沒有坐得下的桌、或坐得下的都被佔了，都是同一個 SLOT_UNAVAILABLE
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

        val reservation = ReservationEntity().apply {
            this.memberId = memberId
            startTime = start
            endTime = end
            this.adultCount = adultCount
            this.childCount = childCount
            this.partySize = partySize
            tableId = table.id
            accessToken = newAccessToken()
        }
        fillContact(reservation, request, memberId)

        // 立刻 insert，約束錯誤才會在這個 try 裡丟出來，不會拖到 commit 才炸、catch 接不到
        try {
            reservationRepo.saveAndFlush(reservation)
        } catch (e: DataIntegrityViolationException) {
            // 只認 uk_reservation_table_start，這才是「剛好被別人訂走」。
            // 其他唯一鍵（編號、access_token）、外鍵、NOT NULL 出錯是程式或資料的問題，
            // 講成客滿會把 bug 蓋掉，照常往外丟
            if (e.mostSpecificCause.message?.contains(UNIQUE_TABLE_START) != true) throw e
            throw ApiException.conflict("SLOT_UNAVAILABLE", "這個時段剛好被訂走了，請改選其他時段")
        }
        // 編號 = 用餐日 + id，不足 4 碼補 0（跟 seed 的 LPAD 一樣），超過也不截斷、不取模，
        // 取模的話 id 差 10000 的兩筆在同一天會撞號
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

    // 客人線上取消：期限是訂位前 30 分，也就是預約保留開始的時間；之後只能請櫃檯代取消。
    // 1. 鎖訂位再驗身分。取消會跟櫃檯報到、代取消搶同一筆，鎖了之後讀到的狀態才可信。
    //    身分在狀態前面驗：不是自己的訂位一律 404，連它是不是已經取消都不讓對方知道
    // 2. 狀態要還是 CONFIRMED，報到、取消、NO_SHOW 過的都不能再取消
    // 3. 期限用店家時區的現在比，剛好等於期限那一刻也算過了，跟 detail 的 cancellable 是同一條線
    // 4. entity 的 cancel() 會把 table_id 清成 NULL，那個時段的名額才放得出來
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

    // 會員看自己的、匿名憑訂位時拿到的 accessToken；只憑 id 不能動別人的訂位。
    // 兩種身分都沒帶才是 401；帶了但對不上、或根本沒這筆，都是同一個 404，從回應看不出差別
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

    // 不用 == / equals：它們遇到第一個不同的字元就回傳，量回應時間就能一個字元一個字元猜出 token
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

    // 會員：手機一律用會員資料裡的，姓名請求有填就用請求的，沒有就退回暱稱。
    // 查不到或不是 ACTIVE 的會員在這裡擋成 401（mock 模式下 id 可以隨便帶），不要等 insert 才撞外鍵。
    // 匿名：姓名和手機一定要有，email 選填、只存不寄
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

    // start 要剛好落在設定排出來的格子上（firstSlot 起每 slotMinutes 一格到 lastSlot）。
    // 資料模型本身不限固定時段，只是目前只開放這幾格；要放寬就改這裡和 slotTimes
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
            // 預先點餐（M7 7.E1）還沒做，先固定回 false
            hasPreorder = false,
        )
    }

    private fun toOffset(time: LocalDateTime): OffsetDateTime = properties.toOffset(time)

    // 匿名客人只靠這串存取訂位，所以用 SecureRandom 產 24 bytes（192 bit）讓人猜不到；
    // 加上 rsv_ 前綴一共 52 個字元，放得進 access_token 的 VARCHAR(64)
    private fun newAccessToken(): String {
        val bytes = ByteArray(24)
        random.nextBytes(bytes)
        return "rsv_" + bytes.joinToString("") { "%02x".format(it) }
    }

    companion object {
        private val HH_MM = DateTimeFormatter.ofPattern("HH:mm")
        private val YYMMDD = DateTimeFormatter.ofPattern("yyMMdd")
        // 要跟 schema 的索引名稱一致，改索引名時這裡也要改，不然撞到唯一鍵不會被轉成 SLOT_UNAVAILABLE
        private const val UNIQUE_TABLE_START = "uk_reservation_table_start"
        private val PREORDER_DEADLINE = LocalTime.of(20, 0)
        private val random = SecureRandom()
    }
}
