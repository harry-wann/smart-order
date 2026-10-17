package tw.ispan.smartorder.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ReorderOptionValuesRequest(
        @NotEmpty(message = "選項排序不可為空")
        List<@NotNull(message = "選項 ID 不可為空") Long> optionValueIds
) {}
