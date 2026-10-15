package tw.ispan.smartorder.reservation.dto.response

import tw.ispan.smartorder.reservation.enums.ReservationStatus
import java.time.OffsetDateTime

data class ReservationCreatedResponse(
    val reservationId: Long,
    val reservationNo: String,
    // 匿名訂位之後查詢、取消要帶它（X-Reservation-Token 標頭）；會員可以忽略。
    // 只有建立這一次會回，之後的查詢都不會再給，前端要自己存起來
    val accessToken: String,
    val tableNo: String,
    val seats: Int,
    val startTime: OffsetDateTime,
    // 含清桌緩衝，不是客人實際吃完的時間
    val endTime: OffsetDateTime,
    val status: ReservationStatus,
    // 訂位前 30 分，也就是預約保留開始的時間
    val cancellableUntil: OffsetDateTime,
    // 用餐前一天 20:00，跟上面的取消期限是兩條線，過了預點期限還是可以取消
    val preorderEditableUntil: OffsetDateTime,
    val hasPreorder: Boolean,
)
