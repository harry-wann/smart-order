package tw.ispan.smartorder.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record SaveMenuItemRequest(
        @NotBlank
        @Size(max = 100)
        String name,

        @Size(max = 255)
        String description,

        @NotNull
        Long categoryId,

        @NotNull
        @DecimalMin("0.00")
        BigDecimal price,

        @Size(max = 500)
        String imageUrl,

        @NotNull
        @Min(0)
        Integer stock,

        @NotNull
        Boolean active
) {}
