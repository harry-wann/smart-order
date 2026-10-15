package tw.ispan.smartorder.staff.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.filter.OncePerRequestFilter

// 只認身分、不擋請求：哪些路徑要登入、要什麼角色寫在 SecurityConfig。
// 角色直接取自 JWT、不查資料庫：員工被停用或改角色後，舊權杖要等到過期（最多 12 小時）才失效。
// 跟 SessionTokenFilter 一樣用 new 加進 security chain，不要加 @Component，否則會被註冊兩次
class StaffJwtFilter(
    private val jwtProvider: StaffJwtProvider,
) : OncePerRequestFilter() {

    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        return !request.requestURI.startsWith("/api/admin/")
    }

    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, chain: FilterChain) {
        val header = request.getHeader(HttpHeaders.AUTHORIZATION)
        val principal = header?.takeIf { it.startsWith(BEARER) }?.let { jwtProvider.parse(it.removePrefix(BEARER)) }
        if (principal != null) {
            val authorities = listOf(SimpleGrantedAuthority("ROLE_${principal.role}"))
            SecurityContextHolder.getContext().authentication =
                UsernamePasswordAuthenticationToken(principal, null, authorities)
        }
        chain.doFilter(request, response)
    }

    companion object {
        private const val BEARER = "Bearer "
    }
}
