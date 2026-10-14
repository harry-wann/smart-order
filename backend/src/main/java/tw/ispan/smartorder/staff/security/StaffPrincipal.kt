package tw.ispan.smartorder.staff.security

import org.springframework.security.core.context.SecurityContextHolder

data class StaffPrincipal(
    val id: Long,
    val displayName: String,
    val role: String,
) {
    companion object {
        // 有帶員工 JWT 的請求才拿得到；受保護的端點一定有，因為沒帶會先被擋成 401
        fun current(): StaffPrincipal? =
            SecurityContextHolder.getContext().authentication?.principal as? StaffPrincipal
    }
}
