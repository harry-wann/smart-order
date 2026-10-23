package tw.ispan.smartorder.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

// 依顯示順序列出「全部」分類的 id（含停用的）；第一個排最前面
public record ReorderMenuCategoriesRequest(
        @NotEmpty(message = "分類排序不可為空")
        List<@NotNull(message = "分類 ID 不可為空") Long> categoryIds
) {}
