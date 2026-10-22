package tw.ispan.smartorder.tabledetail.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import tw.ispan.smartorder.tabledetail.service.SettlementException;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice(assignableTypes = TableController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SettlementExceptionAdvice {
    @ExceptionHandler(SettlementException.class)
    public ResponseEntity<Map<String, Object>> handleSettlement(SettlementException exception,
                                                                  HttpServletRequest request) {
        Map<String, Object> body = body(exception.getStatus(), exception.getCode(),
                exception.getMessage(), request);
        if (exception.getBill() != null) body.put("bill", exception.getBill());
        if (exception.getReason() != null) body.put("reason", exception.getReason());
        return ResponseEntity.status(exception.getStatus()).body(body);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleBody(HttpServletRequest request) {
        return ResponseEntity.badRequest().body(body(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED",
                "請求格式不正確", request));
    }

    private Map<String, Object> body(HttpStatus status, String code, String message,
                                     HttpServletRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", OffsetDateTime.now());
        body.put("status", status.value());
        body.put("code", code);
        body.put("message", message);
        body.put("path", request.getRequestURI());
        return body;
    }
}
