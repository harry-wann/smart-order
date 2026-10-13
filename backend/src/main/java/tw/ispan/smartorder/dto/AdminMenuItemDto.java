package tw.ispan.smartorder.dto;

import java.math.BigDecimal;

public record AdminMenuItemDto(
        String img,
        String name,
        BigDecimal price,
        Long categoryId
) {}
