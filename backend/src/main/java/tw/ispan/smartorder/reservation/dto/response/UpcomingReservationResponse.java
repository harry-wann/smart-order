package tw.ispan.smartorder.reservation.dto.response;

import java.time.OffsetDateTime;

public record UpcomingReservationResponse(
        String reservationNo,
        String name,
        OffsetDateTime startTime,
        OffsetDateTime endTime,
        int partySize) {
}
