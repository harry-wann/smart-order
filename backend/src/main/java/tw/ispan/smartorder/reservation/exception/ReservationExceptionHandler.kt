package tw.ispan.smartorder.reservation.exception

import jakarta.servlet.http.HttpServletRequest
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.MissingRequestHeaderException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import tw.ispan.smartorder.reservation.dto.response.ErrorDetail
import tw.ispan.smartorder.reservation.dto.response.ErrorResponse
import java.time.OffsetDateTime

// 只管訂位這個套件；全站共用的 ApiExceptionHandler 還沒有 code 欄位，先不動它
@RestControllerAdvice(basePackages = ["tw.ispan.smartorder.reservation"])
@Order(Ordered.HIGHEST_PRECEDENCE)
class ReservationExceptionHandler {

    @ExceptionHandler(ApiException::class)
    fun handleApi(exception: ApiException, request: HttpServletRequest): ResponseEntity<ErrorResponse> {
        return response(exception.status, exception.code, exception.message ?: "請求無法完成", request)
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(
        exception: MethodArgumentNotValidException,
        request: HttpServletRequest,
    ): ResponseEntity<ErrorResponse> {
        val details = exception.bindingResult.fieldErrors.map {
            ErrorDetail(it.field, it.defaultMessage ?: "格式不正確")
        }
        return response(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "欄位格式不正確", request, details)
    }

    @ExceptionHandler(
        HttpMessageNotReadableException::class,
        MissingServletRequestParameterException::class,
        MethodArgumentTypeMismatchException::class,
        MissingRequestHeaderException::class,
    )
    fun handleBadRequest(request: HttpServletRequest): ResponseEntity<ErrorResponse> {
        return response(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "請求格式不正確", request)
    }

    private fun response(
        status: HttpStatus,
        code: String,
        message: String,
        request: HttpServletRequest,
        details: List<ErrorDetail> = emptyList(),
    ): ResponseEntity<ErrorResponse> {
        val body = ErrorResponse(OffsetDateTime.now(), status.value(), code, message, request.requestURI, details)
        return ResponseEntity.status(status).body(body)
    }
}
