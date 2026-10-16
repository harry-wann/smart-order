package tw.ispan.smartorder.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateOptionValueRequest(
        @NotBlank(message = "請輸入選項名稱")
        @Size(max = 50, message = "選項名稱最多 50 個字元")
        String name,

        @NotNull(message = "價差必填")
        @DecimalMin(value = "0.00", message = "價差必須大於或等於 0")
        @Digits(integer = 8, fraction = 2, message = "價差最多 8 位整數與 2 位小數")
        BigDecimal priceDelta
) {}
