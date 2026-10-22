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
import tw.ispan.smartorder.controller.KitchenTicketsController;

import java.time.OffsetDateTime;
import java.util.List;

// 原檔名 ApiExceptionAdvice.kt

// 錯誤回應照 04 §1.2 帶 code。只管列在 basePackages 的套件；
// 全站共用的 ApiExceptionHandler 還沒有 code 欄位，其他人的 API 先不動。
// basePackages 看的是「丟例外的那支 controller」在哪個套件，所以隊友的 controller 出錯還是走原本那份，
// 他們頁面現在讀的錯誤格式不會被換掉。
// 全站那份也處理 MethodArgumentNotValidException、HttpMessageNotReadableException，
// 沒排順序的話訂位這邊的驗證失敗會落到誰手上不一定，所以這份要排最前面。
// 只有 controller 丟出來的例外會進來；filter 層的 401／403 不會經過這裡，那邊在 SecurityConfig 自己寫
@RestControllerAdvice(basePackages = {
        "tw.ispan.smartorder.reservation",
        "tw.ispan.smartorder.staff",
        "tw.ispan.smartorder.ordercart.controller"
}, assignableTypes = KitchenTicketsController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApiExceptionAdvice {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException exception, HttpServletRequest request) {
        String message = exception.getMessage() != null ? exception.getMessage() : "請求無法完成";
        return response(exception.getStatus(), exception.getCode(), message, request, List.of());
    }

    // @Valid 沒過：每個欄位一筆放進 details，訊息就是 DTO 上寫的那句，外層 message 只是總稱
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

    // 請求還沒走到欄位驗證就壞了：JSON 格式錯或有不認得的欄位（fail-on-unknown-properties 有開）、
    // 日期數字格式錯、少帶必填的參數或標頭。都是前端送錯，統一回 VALIDATION_FAILED，
    // 不把框架的英文錯誤訊息直接丟給使用者；沒有欄位資訊，所以不帶 details
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
