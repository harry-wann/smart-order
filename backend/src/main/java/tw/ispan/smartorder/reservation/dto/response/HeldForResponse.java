package tw.ispan.smartorder.reservation.dto.response;

import java.time.OffsetDateTime;

public record HeldForResponse(Long reservationId, String reservationNo, String name, int partySize, OffsetDateTime startTime) {
}
