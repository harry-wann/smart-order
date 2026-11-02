package tw.ispan.smartorder.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ReorderOptionGroupsRequest(
        @NotEmpty(message = "選項群組 ID 清單不可為空")
        List<@NotNull(message = "選項群組 ID 不可為空") Long> optionGroupIds
) {}
