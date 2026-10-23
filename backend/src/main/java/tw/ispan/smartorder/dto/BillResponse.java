package tw.ispan.smartorder.dto;

import java.math.BigDecimal;
import java.util.List;

public record BillResponse(
        String tableNo,
        String openedAt,
        String now,
        int guestCount,
        int itemCount,
        BigDecimal subtotal,
        BigDecimal serviceFee,
        BigDecimal total,
        List<BillTicket> orders,
        boolean onlinePaymentAvailable
) {
    public record BillTicket(
            long id,
            int sequenceNo,
            String placedAt,
            BigDecimal total,
            List<BillItem> items
    ) {}

    public record BillItem(
            long id,
            String name,
            int quantity,
            BigDecimal lineTotal,
            List<String> options,
            String note
    ) {}
}
