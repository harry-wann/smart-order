package tw.ispan.smartorder.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

// categoryIds：依新的顯示順序列出「全部」分類的 id（含停用的）；第一個排最前面。
// expectedCategoryIds：移動之前畫面上看到的順序（同樣是全部分類）。有帶的話，後端會先比對資料庫目前的順序，
// 不一樣代表別人剛排過，回 409 CATEGORY_LIST_CHANGED，不會把別人排好的順序蓋掉；
// 可以省略（舊的呼叫端），省略就只檢查分類成員
public record ReorderMenuCategoriesRequest(
        @NotEmpty(message = "分類排序不可為空")
        List<@NotNull(message = "分類 ID 不可為空") Long> categoryIds,

        List<@NotNull(message = "分類 ID 不可為空") Long> expectedCategoryIds
) {}
