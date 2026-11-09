package tw.ispan.smartorder.dto;

// 放棄待確認付款後這筆的狀態：SUPERSEDED（已放棄）、SUCCESS（其實已付款）、REQUIRES_REVIEW（金額不符待櫃檯確認）
public record PaymentReleaseResponse(String status) {}
