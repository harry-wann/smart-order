package tw.ispan.smartorder.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

// 新增、改名、停用／啟用、改出餐順序共用。
// 新增：name 必填（service 檢查），active 省略代表啟用，cookOrder 省略代表 2（菜盤）。
// 修改：name、active、cookOrder 都可以省略，省略代表維持原值
// （只切換停用／啟用就只送 active、只改出餐順序就只送 cookOrder，不用帶畫面上可能已過期的名稱）
public record SaveMenuCategoryRequest(
        @Size(max = 50, message = "分類名稱最多 50 個字元")
        String name,

        Boolean active,

        // 出餐順序：1 鍋底、2 菜盤、3 火鍋料、4 肉品、5 主食、6 飲料甜點
        @Min(value = 1, message = "出餐順序只能是 1 到 6")
        @Max(value = 6, message = "出餐順序只能是 1 到 6")
        Integer cookOrder
) {}
