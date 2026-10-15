package tw.ispan.smartorder.reservation.security

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component

// 會員登入（工作包 A）完成前的替身：只認 "Bearer mock-member-{id}"。
// 換成真的會員 JWT 時只改這個類別，訂位這邊的呼叫端不用動。
@Component
class MemberIdentityResolver {

    fun memberId(request: HttpServletRequest): Long? {
        val header = request.getHeader(HttpHeaders.AUTHORIZATION) ?: return null
        if (!header.startsWith(BEARER + MOCK_PREFIX)) return null
        return header.removePrefix(BEARER + MOCK_PREFIX).toLongOrNull()
    }

    companion object {
        private const val BEARER = "Bearer "
        private const val MOCK_PREFIX = "mock-member-"
    }
}
