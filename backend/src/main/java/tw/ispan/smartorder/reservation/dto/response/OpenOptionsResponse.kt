package tw.ispan.smartorder.reservation.dto.response

import java.time.OffsetDateTime

// S-02 點空桌進開桌頁要的資料；全部是即時查詢，不存任何狀態
data class OpenOptionsResponse(
    val tableId: Long,
    val tableNo: String,
    val seats: Int,
    val area: String,
    val status: String,
    // 已叫號、等著入座的候位（候位的開桌流程在 S-02c）
    val waitlist: List<OpenWaitlistItem>,
    // 用餐時間在現在 −10 ～ +30 分、坐得下這張桌的訂位；不限定原本配到哪張桌
    val reservations: List<OpenReservationItem>,
    // 這張桌現在保留給哪一筆
    val heldFor: HeldForResponse?,
    // 這張桌 115 分鐘內要開始的別筆訂位，只提醒不擋
    val upcomingOnThisTable: UpcomingReservationResponse?,
)

data class OpenWaitlistItem(
    val id: Long,
    val no: String,
    val name: String,
    val partySize: Int,
    val waitedMinutes: Long,
    val status: String,
)

data class OpenReservationItem(
    val id: Long,
    val reservationNo: String,
    val name: String,
    // 後端先遮好（0933***210），這份清單只讓櫃檯認人，不需要完整號碼
    val phoneMasked: String,
    val startTime: OffsetDateTime,
    val adultCount: Int,
    val childCount: Int,
    val partySize: Int,
    val preorderItemCount: Int,
    val assignedTableNo: String?,
)

data class HeldForResponse(
    val reservationId: Long,
    val reservationNo: String,
    val name: String,
    val partySize: Int,
    val startTime: OffsetDateTime,
)

data class UpcomingReservationResponse(
    val reservationNo: String,
    val name: String,
    val startTime: OffsetDateTime,
    val endTime: OffsetDateTime,
    val partySize: Int,
)
