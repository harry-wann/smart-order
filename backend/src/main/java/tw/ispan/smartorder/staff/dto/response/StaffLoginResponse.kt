package tw.ispan.smartorder.staff.dto.response

import java.time.OffsetDateTime

data class StaffLoginResponse(
    val token: String,
    val expiresAt: OffsetDateTime,
    val staff: StaffResponse,
)

data class StaffResponse(
    val id: Long,
    val displayName: String,
    val role: String,
)
