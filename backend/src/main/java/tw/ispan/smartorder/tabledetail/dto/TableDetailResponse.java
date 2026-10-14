package tw.ispan.smartorder.tabledetail.dto;

import java.math.BigDecimal;
import java.util.List;

public record TableDetailResponse(
        String tableNumber,
        String tableInfo,
        String diningStatus,
        String seatedTime,
        long diningMinutes,
        int adultCount,
        int childCount,
        BigDecimal subtotal,
        BigDecimal serviceFee,
        BigDecimal total,
        List<OrderDto> orders
) {

    public record OrderDto(
            long id,
            String status,
            String time,
            BigDecimal total,
            List<OrderItemDto> items
    ) {
    }

    public record OrderItemDto(
            long id,
            String name,
            int quantity,
            String note,
            String status
    ) {
    }
}