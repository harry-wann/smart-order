package tw.ispan.smartorder.ordercart.dto;

import java.math.BigDecimal;
import java.util.List;

public record CartResponse(
        Long sessionId,
        String tableNumber,
        boolean locked,
        Long cartVersion,
        List<CartItemResponse> items
) {
    public record CartItemResponse(
            Long id,
            String name,
            BigDecimal price,
            Integer quantity,
            String people,
            List<String> options,
            String note,
            boolean canEdit
    ) {}
}