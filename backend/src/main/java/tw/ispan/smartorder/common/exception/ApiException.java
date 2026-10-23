package tw.ispan.smartorder.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

// 原檔名 ApiException.kt

// code 對應 04 API 規格 §1.3 的錯誤碼，前端靠它決定要顯示什麼。
// service 發現業務上不行就直接 throw，不用每層都回傳錯誤再一路往上帶，統一由 ApiExceptionAdvice 轉成回應。
// 繼承 RuntimeException：@Transactional 遇到會 rollback，丟錯誤的同時這次交易寫的東西也一起作廢
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    // 只有 429 TOO_MANY_ATTEMPTS 會帶：還要等幾秒才能再試，前端拿來顯示倒數；其他錯誤都是 null
    private final Long retryAfterSeconds;

    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, null);
    }

    private ApiException(HttpStatus status, String code, String message, Long retryAfterSeconds) {
        super(message);
        this.status = status;
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    // 400、401、403、404 的 code 固定一個；409 每種衝突的 code 都不一樣
    // （SLOT_UNAVAILABLE、TABLE_OCCUPIED…），前端要靠它分辨，所以 conflict 一定要自己帶
    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message);
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
    }

    public static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", message);
    }

    // 04 §1.3：要太多次（例如驗證碼 10 分鐘內超過 3 次），回應多帶 retryAfterSeconds
    public static ApiException tooManyAttempts(String message, long retryAfterSeconds) {
        return new ApiException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ATTEMPTS", message, retryAfterSeconds);
    }
}
