package tw.ispan.smartorder.ordersubmitted.dto;

import java.util.List;

public record OrderSubmittedResponse(
        Long id,
        Integer sequenceNo,
        String status,
        List<OrderItemResponse> items
) {
    public record OrderItemResponse(
            Long id,
            String name,
            Integer quantity,
            List<String> options,
            String note,
            String status
    ) {
    }
}