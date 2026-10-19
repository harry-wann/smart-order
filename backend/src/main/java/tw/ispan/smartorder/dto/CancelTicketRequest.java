package tw.ispan.smartorder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CancelTicketRequest(
        @JsonProperty("cancel_reason") String cancelReason
) {
}
