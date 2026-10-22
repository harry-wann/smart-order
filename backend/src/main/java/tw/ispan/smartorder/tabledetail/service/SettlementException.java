package tw.ispan.smartorder.tabledetail.service;

import org.springframework.http.HttpStatus;
import tw.ispan.smartorder.tabledetail.dto.TableDetailResponse;

public class SettlementException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    private final TableDetailResponse bill;
    private final String reason;

    private SettlementException(HttpStatus status, String code, String message,
                                TableDetailResponse bill, String reason) {
        super(message);
        this.status = status;
        this.code = code;
        this.bill = bill;
        this.reason = reason;
    }

    public static SettlementException validation(String message) {
        return new SettlementException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message, null, null);
    }

    public static SettlementException notFound() {
        return new SettlementException(HttpStatus.NOT_FOUND, "NOT_FOUND", "找不到用餐場次", null, null);
    }

    public static SettlementException closed(String reason) {
        return new SettlementException(HttpStatus.CONFLICT, "SESSION_CLOSED", "此用餐場次已結束", null, reason);
    }

    public static SettlementException billChanged(TableDetailResponse bill) {
        return new SettlementException(HttpStatus.CONFLICT, "BILL_CHANGED", "金額有變動，請重新確認", bill, null);
    }

    public static SettlementException conflict(String code, String message) {
        return new SettlementException(HttpStatus.CONFLICT, code, message, null, null);
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
    public TableDetailResponse getBill() { return bill; }
    public String getReason() { return reason; }
}
