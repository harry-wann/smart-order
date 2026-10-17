package tw.ispan.smartorder.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdateOptionValueStatusRequest(
        @NotNull(message = "啟用狀態必填")
        Boolean active
) {}
