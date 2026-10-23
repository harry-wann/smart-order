package tw.ispan.smartorder.dto;

// count 是分類底下的品項總數（含已下架）；sortOrder 越小越前面；active=false 是停用，顧客端看不到。
// cookOrder 是出菜看板的出餐順序（1 鍋底、2 菜盤、3 火鍋料、4 肉品、5 主食、6 飲料甜點）
public record AdminMenuCategoryDto(
        Long id,
        String name,
        Long count,
        Integer sortOrder,
        Boolean active,
        Integer cookOrder
) {}
