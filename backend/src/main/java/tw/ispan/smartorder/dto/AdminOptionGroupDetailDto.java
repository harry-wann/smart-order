package tw.ispan.smartorder.dto;

import java.util.List;

public record AdminOptionGroupDetailDto(
        List<AdminOptionValueDto> items,
        List<AdminAssociatedMenuItemDto> associatedProducts
) {}
