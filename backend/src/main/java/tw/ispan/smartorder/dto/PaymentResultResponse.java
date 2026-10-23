package tw.ispan.smartorder.dto;

public record PaymentResultResponse(
        String status,
        String transactionNo,
        String method,
        int amount,
        String paidAt,
        String tableNo,
        int guestCount
) {}
