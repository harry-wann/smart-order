package tw.ispan.smartorder.reservation.security

import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component

// 會員登入（工作包 A）完成前的替身：只認 "Bearer mock-member-{id}"。
// 誰都能冒用任一會員，所以預設關閉，只有 .env 設 MEMBER_MOCK_ENABLED=true 才開。
// 換成真的會員 JWT 時只改這個類別，訂位這邊的呼叫端不用動。
@Component
class MemberIdentityResolver(
    @Value("\${app.member-mock.enabled:false}") private val mockEnabled: Boolean,
) {
    init {
        if (mockEnabled) LoggerFactory.getLogger(javaClass).warn("會員 mock 已開啟，只能用在本機開發")
    }

    fun memberId(request: HttpServletRequest): Long? {
        if (!mockEnabled) return null
        val header = request.getHeader(HttpHeaders.AUTHORIZATION) ?: return null
        if (!header.startsWith(BEARER + MOCK_PREFIX)) return null
        return header.removePrefix(BEARER + MOCK_PREFIX).toLongOrNull()
    }

    companion object {
        private const val BEARER = "Bearer "
        private const val MOCK_PREFIX = "mock-member-"
    }
}
