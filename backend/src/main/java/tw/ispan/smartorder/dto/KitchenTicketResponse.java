package tw.ispan.smartorder.dto;

import java.time.LocalDateTime;
import java.util.List;

public record KitchenTicketResponse(
        Long orderId,
        Integer sequenceNo,
        LocalDateTime placedAt,
        String tableNo,
        List<KitchenItemResponse> items
) {
    public record KitchenItemResponse(
            Long id,
            String name,
            Integer quantity,
            String status,
            List<String> options,
            String note
    ) {}
}
