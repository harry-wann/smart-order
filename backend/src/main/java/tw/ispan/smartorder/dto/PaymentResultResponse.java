package tw.ispan.smartorder.dto;

import java.math.BigDecimal;

public record PaymentResultResponse(
        String status,
        String transactionNo,
        String method,
        BigDecimal amount,
        String paidAt,
        String tableNo,
        int guestCount
) {}
