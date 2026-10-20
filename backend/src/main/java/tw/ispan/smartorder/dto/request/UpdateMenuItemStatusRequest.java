package tw.ispan.smartorder.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdateMenuItemStatusRequest(@NotNull Boolean active) {}
