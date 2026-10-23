package tw.ispan.smartorder.dto.request;

import jakarta.validation.constraints.Size;

// 新增、改名、停用／啟用共用。
// 新增：name 必填（service 檢查），active 省略代表啟用。
// 修改：name、active 都可以省略，省略代表維持原值（只切換停用／啟用就只送 active，不用帶畫面上可能已過期的名稱）
public record SaveMenuCategoryRequest(
        @Size(max = 50, message = "分類名稱最多 50 個字元")
        String name,

        Boolean active
) {}
