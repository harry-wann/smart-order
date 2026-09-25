package tw.ispan.smartorder.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** POST 使用的完整資料格式。 */
public record ProductCreateRequest(
    @NotBlank(message = "productName 不可空白")
    @Size(max = 40, message = "productName 最多 40 個字元")
    String productName,

    @NotNull(message = "unitPrice 必填")
    @DecimalMin(value = "0.0", message = "unitPrice 不可小於 0")
    BigDecimal unitPrice,

    @NotNull(message = "unitsInStock 必填")
    @PositiveOrZero(message = "unitsInStock 不可小於 0")
    @Max(value = 32767, message = "unitsInStock 不可超過 32767")
    Integer unitsInStock,

    @NotNull(message = "discontinued 必填")
    Boolean discontinued,

    @NotNull(message = "categoryId 必填")
    @Positive(message = "categoryId 必須是正整數")
    Integer categoryId
) {
}
