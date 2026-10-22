package tw.ispan.smartorder.reservation.dto.response;

import java.time.OffsetDateTime;
import tw.ispan.smartorder.reservation.enums.ReservationStatus;

public record ReservationCreatedResponse(
        Long reservationId,
        String reservationNo,
        // 匿名訂位之後查詢、取消要帶它（X-Reservation-Token 標頭）；會員可以忽略。
        // 只有建立這一次會回，之後的查詢都不會再給，前端要自己存起來
        String accessToken,
        String tableNo,
        Integer seats,
        OffsetDateTime startTime,
        // 含清桌緩衝，不是客人實際吃完的時間
        OffsetDateTime endTime,
        ReservationStatus status,
        // 訂位前 30 分，也就是預約保留開始的時間
        OffsetDateTime cancellableUntil,
        // 用餐前一天 20:00，跟上面的取消期限是兩條線，過了預點期限還是可以取消
        OffsetDateTime preorderEditableUntil,
        boolean hasPreorder) {
}
