package tw.ispan.smartorder.reservation.dto.response;

import java.time.LocalDate;
import java.util.List;

public record AvailabilityResponse(
        LocalDate date,
        Long diningMinutes,
        Long bufferMinutes,
        List<SlotResponse> slots) {
}
