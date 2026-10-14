package tw.ispan.smartorder.reservation.dto.response

import tw.ispan.smartorder.reservation.enums.CancelSource
import tw.ispan.smartorder.reservation.enums.ReservationStatus
import java.time.OffsetDateTime

data class AdminReservationResponse(
    val reservationId: Long,
    val reservationNo: String,
    val startTime: OffsetDateTime,
    val endTime: OffsetDateTime,
    val contactName: String,
    // 店家端看完整號碼，畫面上自己遮罩
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
    val checkInFrom: OffsetDateTime,
    val checkInUntil: OffsetDateTime,
    val cancelSource: CancelSource?,
    val cancelledAt: OffsetDateTime?,
    val cancelledByStaffName: String?,
    val preorderItemCount: Int,
)
