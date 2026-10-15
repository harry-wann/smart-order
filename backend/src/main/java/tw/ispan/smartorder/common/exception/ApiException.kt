package tw.ispan.smartorder.common.exception

import org.springframework.http.HttpStatus

// code 對應 04 API 規格 §1.3 的錯誤碼，前端靠它決定要顯示什麼
class ApiException(
    val status: HttpStatus,
    val code: String,
    message: String,
) : RuntimeException(message) {

    companion object {
        fun badRequest(message: String) = ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", message)
        fun notFound(message: String) = ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", message)
        fun conflict(code: String, message: String) = ApiException(HttpStatus.CONFLICT, code, message)
        fun unauthorized(message: String) = ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", message)
        fun forbidden(message: String) = ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN", message)
    }
}
