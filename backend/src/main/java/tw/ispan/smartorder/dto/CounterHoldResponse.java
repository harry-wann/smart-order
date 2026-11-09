package tw.ispan.smartorder.dto;

// held = true：已鎖住，前端打開櫃檯結帳視窗。
// resolvedTransactionNo 有值：自己上一筆線上付款向綠界查到已付款，前端直接去付款結果頁
public record CounterHoldResponse(boolean held, String resolvedTransactionNo) {
    public static CounterHoldResponse locked() {
        return new CounterHoldResponse(true, null);
    }

    public static CounterHoldResponse resolved(String transactionNo) {
        return new CounterHoldResponse(false, transactionNo);
    }
}
