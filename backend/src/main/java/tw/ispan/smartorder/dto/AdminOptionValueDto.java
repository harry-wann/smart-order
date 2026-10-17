package tw.ispan.smartorder.dto;

import java.math.BigDecimal;

public record AdminOptionValueDto(
        Long id,
        String name,
        BigDecimal priceDelta,
        Integer sortOrder,
        Boolean active
) {}
