package tw.ispan.smartorder.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import tw.ispan.smartorder.common.dto.ErrorDetail;
import tw.ispan.smartorder.common.dto.ErrorResponse;

import java.time.OffsetDateTime;
import java.util.List;

// 原檔名 ApiExceptionAdvice.kt

// 錯誤回應照 04 §1.2 帶 code。只管列在 basePackages 的套件；
// 全站共用的 ApiExceptionHandler 還沒有 code 欄位，其他人的 API 先不動
@RestControllerAdvice(basePackages = {"tw.ispan.smartorder.reservation", "tw.ispan.smartorder.staff"})
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApiExceptionAdvice {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException exception, HttpServletRequest request) {
        String message = exception.getMessage() != null ? exception.getMessage() : "請求無法完成";
        return response(exception.getStatus(), exception.getCode(), message, request, List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException exception,
            HttpServletRequest request) {
        List<ErrorDetail> details = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new ErrorDetail(
                        error.getField(),
                        error.getDefaultMessage() != null ? error.getDefaultMessage() : "格式不正確"))
                .toList();
        return response(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "欄位格式不正確", request, details);
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class,
            MissingRequestHeaderException.class
    })
    public ResponseEntity<ErrorResponse> handleBadRequest(HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "請求格式不正確", request, List.of());
    }

    private ResponseEntity<ErrorResponse> response(
            HttpStatus status,
            String code,
            String message,
            HttpServletRequest request,
            List<ErrorDetail> details) {
        ErrorResponse body = new ErrorResponse(
                OffsetDateTime.now(), status.value(), code, message, request.getRequestURI(), details);
        return ResponseEntity.status(status).body(body);
    }
}
