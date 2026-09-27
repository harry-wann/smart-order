package tw.ispan.smartorder.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** PATCH 使用的部分更新格式；只傳想修改的欄位。 */
public record ProductPatchRequest(
    @Size(max = 40, message = "productName 最多 40 個字元")
    String productName,

    @DecimalMin(value = "0.0", message = "unitPrice 不可小於 0")
    BigDecimal unitPrice,

    @PositiveOrZero(message = "unitsInStock 不可小於 0")
    @Max(value = 32767, message = "unitsInStock 不可超過 32767")
    Integer unitsInStock,

    Boolean discontinued,

    @Positive(message = "categoryId 必須是正整數")
    Integer categoryId
) {
    public boolean isEmpty() {
        return productName == null
                && unitPrice == null
                && unitsInStock == null
                && discontinued == null
                && categoryId == null;
    }
}
