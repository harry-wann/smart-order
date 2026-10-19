package tw.ispan.smartorder.dto;

import java.math.BigDecimal;

public record AdminMenuItemDto(
        Long id,
        String img,
        String name,
        String description,
        BigDecimal price,
        Long categoryId,
        Integer stock,
        Boolean active
) {}
