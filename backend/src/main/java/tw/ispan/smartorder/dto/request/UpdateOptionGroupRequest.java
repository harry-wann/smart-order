package tw.ispan.smartorder.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateOptionGroupRequest(
        @NotBlank(message = "請輸入群組名稱")
        @Size(max = 50, message = "群組名稱最多 50 個字元")
        String name,

        @NotNull(message = "minSelect 必填")
        @Min(value = 0, message = "minSelect 必須大於或等於 0")
        Integer minSelect,

        @NotNull(message = "maxSelect 必填")
        @Min(value = 1, message = "maxSelect 必須至少為 1")
        Integer maxSelect,

        @NotNull(message = "sortOrder 必填")
        @Min(value = 0, message = "sortOrder 必須大於或等於 0")
        Integer sortOrder
) {
    @AssertTrue(message = "maxSelect 必須大於或等於 minSelect")
    public boolean isSelectionRangeValid() {
        return minSelect == null || maxSelect == null || maxSelect >= minSelect;
    }
}
