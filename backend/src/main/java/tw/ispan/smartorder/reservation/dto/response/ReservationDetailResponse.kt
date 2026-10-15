package tw.ispan.smartorder.reservation.dto.response

import tw.ispan.smartorder.reservation.enums.CancelSource
import tw.ispan.smartorder.reservation.enums.ReservationStatus
import java.time.OffsetDateTime

data class ReservationDetailResponse(
    val reservationId: Long,
    val reservationNo: String,
    val status: ReservationStatus,
    val startTime: OffsetDateTime,
    val endTime: OffsetDateTime,
    val adultCount: Int,
    val childCount: Int,
    val partySize: Int,
    // 已取消的訂位 table_id 會被清掉，這三個欄位就是 null
    val tableNo: String?,
    val seats: Int?,
    val area: String?,
    val contactName: String,
    val member: Boolean,
    val cancellableUntil: OffsetDateTime,
    // 客人自己取消前，前端用它決定取消鈕要不要停用；後端取消時會再擋一次
    val cancellable: Boolean,
    val cancelSource: CancelSource?,
    val cancelledAt: OffsetDateTime?,
    val hasPreorder: Boolean,
)
