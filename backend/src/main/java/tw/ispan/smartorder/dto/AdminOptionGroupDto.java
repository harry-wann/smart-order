package tw.ispan.smartorder.dto;

// menuItemCount：這個群組掛在幾個品項（含下架的），S-06 左側群組清單顯示用
public record AdminOptionGroupDto(
        Long id,
        String name,
        Integer minSelect,
        Integer maxSelect,
        Integer sortOrder,
        Long menuItemCount
) {}
