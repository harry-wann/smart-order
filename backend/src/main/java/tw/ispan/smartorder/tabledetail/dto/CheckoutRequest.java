package tw.ispan.smartorder.tabledetail.dto;

import java.math.BigDecimal;

public record CheckoutRequest(
        String method,
        BigDecimal expectedTotal
) {
}
