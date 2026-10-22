package tw.ispan.smartorder.reservation.dto.response;

import java.time.OffsetDateTime;
import tw.ispan.smartorder.reservation.enums.CancelSource;
import tw.ispan.smartorder.reservation.enums.ReservationStatus;

public record ReservationDetailResponse(
        Long reservationId,
        String reservationNo,
        ReservationStatus status,
        OffsetDateTime startTime,
        OffsetDateTime endTime,
        int adultCount,
        int childCount,
        int partySize,
        // 已取消的訂位 table_id 會被清掉，這三個欄位就是 null
        String tableNo,
        Integer seats,
        String area,
        String contactName,
        boolean member,
        OffsetDateTime cancellableUntil,
        // 客人自己取消前，前端用它決定取消鈕要不要停用；後端取消時會再擋一次
        boolean cancellable,
        CancelSource cancelSource,
        OffsetDateTime cancelledAt,
        boolean hasPreorder) {
}
