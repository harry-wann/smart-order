package tw.ispan.smartorder.reservation.dto.response

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.OffsetDateTime

@JsonInclude(JsonInclude.Include.NON_EMPTY)
data class ErrorResponse(
    val timestamp: OffsetDateTime,
    val status: Int,
    val code: String,
    val message: String,
    val path: String,
    val details: List<ErrorDetail> = emptyList(),
)

data class ErrorDetail(
    val field: String,
    val message: String,
)
