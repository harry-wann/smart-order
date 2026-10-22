package tw.ispan.smartorder.reservation.dto.response;

import java.time.OffsetDateTime;
import tw.ispan.smartorder.reservation.enums.CancelSource;
import tw.ispan.smartorder.reservation.enums.ReservationStatus;

public record CancelReservationResponse(
        Long reservationId,
        ReservationStatus status,
        CancelSource cancelSource,
        OffsetDateTime cancelledAt,
        // 櫃檯代客取消才有
        String cancelledByStaffName) {
}
