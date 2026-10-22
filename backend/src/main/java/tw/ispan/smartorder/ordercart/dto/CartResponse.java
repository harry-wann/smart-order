package tw.ispan.smartorder.ordercart.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
            boolean canEdit,
            @JsonProperty("isOwnItem") boolean isOwnItem
    ) {
        // Keep existing Java constructor calls source-compatible while exposing ownership explicitly.
        public CartItemResponse(
                Long id,
                String name,
                BigDecimal price,
                Integer quantity,
                String people,
                List<String> options,
                String note,
                boolean canEdit
        ) {
            this(id, name, price, quantity, people, options, note, canEdit, canEdit);
        }
    }
}
