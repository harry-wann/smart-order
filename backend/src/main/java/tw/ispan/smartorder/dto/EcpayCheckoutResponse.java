package tw.ispan.smartorder.dto;

import java.util.Map;

public record EcpayCheckoutResponse(
        String action,
        Map<String, String> params,
        String resolvedTransactionNo
) {
    public static EcpayCheckoutResponse form(String action, Map<String, String> params) {
        return new EcpayCheckoutResponse(action, params, null);
    }

    // 上一筆交易向綠界查到已付款，不用再送表單，前端直接去結果頁
    public static EcpayCheckoutResponse resolved(String transactionNo) {
        return new EcpayCheckoutResponse(null, null, transactionNo);
    }
}
