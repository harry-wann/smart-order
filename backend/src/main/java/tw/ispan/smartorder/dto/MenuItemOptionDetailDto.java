package tw.ispan.smartorder.dto;

import java.math.BigDecimal;
import java.util.List;

public record MenuItemOptionDetailDto(
        Long id,
        String name,
        String description,
        BigDecimal price,
        List<OptionGroupDto> optionGroups
) {
    public record OptionGroupDto(
            Long optionGroupId,
            String name,
            Integer minSelect,
            Integer maxSelect,
            List<OptionValueDto> optionValues
    ) {}

    public record OptionValueDto(
            Long optionValueId,
            String name,
            BigDecimal priceDelta
    ) {}
}
