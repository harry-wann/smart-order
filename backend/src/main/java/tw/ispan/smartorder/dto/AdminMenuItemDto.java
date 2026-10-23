package tw.ispan.smartorder.dto;

import java.math.BigDecimal;
import java.util.List;

// soupBase=鍋底、refill=免費續加、vegetarian=素食、containsBeef=含牛；欄位不用 is 開頭，避免 Jackson 把 isXxx 的 Boolean 當成 getter 改名。
// optionGroupIds 是這個品項掛的選項群組 id，依顧客端顯示順序排列
public record AdminMenuItemDto(
        Long id,
        String img,
        String name,
        String description,
        BigDecimal price,
        Long categoryId,
        Integer stock,
        Boolean active,
        Boolean soupBase,
        Boolean refill,
        Boolean trackInventory,
        Boolean vegetarian,
        Boolean containsBeef,
        Integer spicyLevel,
        List<Long> optionGroupIds
) {}
