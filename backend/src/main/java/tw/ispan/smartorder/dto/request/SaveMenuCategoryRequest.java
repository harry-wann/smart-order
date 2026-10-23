package tw.ispan.smartorder.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// 新增、改名、停用／啟用共用。active 可以省略：新增時預設啟用，修改時省略代表不變
public record SaveMenuCategoryRequest(
        @NotBlank(message = "請輸入分類名稱")
        @Size(max = 50, message = "分類名稱最多 50 個字元")
        String name,

        Boolean active
) {}
