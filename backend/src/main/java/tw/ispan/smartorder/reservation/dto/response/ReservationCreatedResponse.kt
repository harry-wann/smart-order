package tw.ispan.smartorder.reservation.dto.response

import tw.ispan.smartorder.reservation.enums.ReservationStatus
import java.time.OffsetDateTime

data class ReservationCreatedResponse(
    val reservationId: Long,
    val reservationNo: String,
    // 匿名訂位之後查詢、取消要帶它；會員可以忽略
    val accessToken: String,
    val tableNo: String,
    val seats: Int,
    val startTime: OffsetDateTime,
    val endTime: OffsetDateTime,
    val status: ReservationStatus,
    val cancellableUntil: OffsetDateTime,
    val preorderEditableUntil: OffsetDateTime,
    val hasPreorder: Boolean,
)
