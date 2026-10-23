package tw.ispan.smartorder.dto;

// count 是分類底下的品項總數（含已下架）；sortOrder 越小越前面；active=false 是停用，顧客端看不到
public record AdminMenuCategoryDto(
        Long id,
        String name,
        Long count,
        Integer sortOrder,
        Boolean active
) {}
