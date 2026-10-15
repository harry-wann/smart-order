package tw.ispan.smartorder.reservation.dto.response

import tw.ispan.smartorder.reservation.enums.CancelSource
import tw.ispan.smartorder.reservation.enums.ReservationStatus
import java.time.OffsetDateTime

data class AdminReservationResponse(
    val reservationId: Long,
    val reservationNo: String,
    val startTime: OffsetDateTime,
    // 已經含清桌緩衝，不是客人實際吃完的時間
    val endTime: OffsetDateTime,
    val contactName: String,
    // 這份清單回完整號碼，要不要遮由畫面決定；開桌頁那份清單（OpenReservationItem）則是後端先遮好
    val contactPhone: String,
    val member: Boolean,
    val adultCount: Int,
    val childCount: Int,
    val partySize: Int,
    // 訂位當下配到的桌；取消後是 null
    val assignedTableNo: String?,
    // 報到後實際坐的桌，可能跟配到的不一樣
    val seatedTableNo: String?,
    val status: ReservationStatus,
    // 現在是否在保留窗內（決定「保留 A08」小字）
    val holding: Boolean,
    // 可報到的時間窗：訂位前 30 分到後 10 分。前端拿來決定報到鈕要不要停用，
    // 後端報到時會再擋一次（RESERVATION_TOO_EARLY／EXPIRED）
    val checkInFrom: OffsetDateTime,
    val checkInUntil: OffsetDateTime,
    val cancelSource: CancelSource?,
    val cancelledAt: OffsetDateTime?,
    val cancelledByStaffName: String?,
    // 預先點餐是進階功能，還沒做，目前固定 0；欄位先留著，之後前端不用改
    val preorderItemCount: Int,
)
