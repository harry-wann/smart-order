package tw.ispan.smartorder.dto;

import java.time.Instant;

public record KitchenTicketMessage(
        String type,
        Object payload,
        Instant serverTime
) {
}
