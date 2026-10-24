package tw.ispan.smartorder.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import tw.ispan.smartorder.entity.MenuItemEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// 顧客端菜單列表（GET /api/order/items）的一列。欄位名稱跟原本直接回傳 MenuItemEntity 的 JSON 一致，
// 另外多兩個欄位：
// - categoryId：一次抓全部品項時，前端要靠它依分類分段
// - hasRequiredOptions：品項有沒有掛「必選」群組（min_select > 0）。
//   沒有就能在菜單上按 [+] 直接加 1 份，有就要進詳情頁選規格
// is 開頭的 Boolean 欄位用 @JsonProperty 固定 JSON 名稱，避免 Jackson 把 isXxx 當成 getter 改名
public record CustomerMenuItemDto(
        Long id,
        Long categoryId,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        @JsonProperty("isSoupBase") Boolean isSoupBase,
        Boolean trackInventory,
        @JsonProperty("isRefill") Boolean isRefill,
        String suitableFor,
        Integer spicyLevel,
        @JsonProperty("isVegetarian") Boolean isVegetarian,
        Boolean containsBeef,
        Boolean soldOut,
        String sortOrder,
        Boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        boolean hasRequiredOptions
) {
    public static CustomerMenuItemDto from(MenuItemEntity item, boolean hasRequiredOptions) {
        return new CustomerMenuItemDto(
                item.getId(),
                item.getCategory() == null ? null : item.getCategory().getId(),
                item.getName(),
                item.getDescription(),
                item.getPrice(),
                item.getImageUrl(),
                item.getIsSoupBase(),
                item.getTrackInventory(),
                item.getIsRefill(),
                item.getSuitableFor(),
                item.getSpicyLevel(),
                item.getIsVegetarian(),
                item.getContainsBeef(),
                item.getSoldOut(),
                item.getSortOrder(),
                item.getActive(),
                item.getCreatedAt(),
                item.getUpdatedAt(),
                hasRequiredOptions
        );
    }
}
