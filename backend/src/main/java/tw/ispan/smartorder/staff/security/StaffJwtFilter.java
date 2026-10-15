package tw.ispan.smartorder.staff.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

// 原檔名 StaffJwtFilter.kt

// 只認身分、不擋請求：哪些路徑要登入、要什麼角色寫在 SecurityConfig。
// 角色直接取自 JWT、不查資料庫：每個請求少一次查詢，代價是員工被停用或改角色後，
// 舊權杖要等到過期（最多 12 小時）才失效，停用只擋得住重新登入。要立刻生效就得在這裡查 staff.active。
// 跟 SessionTokenFilter 一樣用 new 加進 security chain，不要加 @Component：
// Spring Boot 會把 Filter 型別的 bean 自動掛到所有請求上，security chain 裡又加一次就跑兩次
public class StaffJwtFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";

    private final StaffJwtProvider jwtProvider;

    public StaffJwtFilter(StaffJwtProvider jwtProvider) {
        this.jwtProvider = jwtProvider;
    }

    // 只看 /api/admin/：顧客端和會員的 API 也會帶 Authorization 標頭，那些不是員工 token，不碰
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/admin/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        // 沒帶、格式不對、驗證失敗都不設 authentication，直接往下走變成匿名；
        // 到 SecurityConfig 的規則那層，需要登入的路徑才會被擋成 401
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        StaffPrincipal principal = header != null && header.startsWith(BEARER)
                ? jwtProvider.parse(header.substring(BEARER.length()))
                : null;
        if (principal != null) {
            List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + principal.role()));
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, null, authorities));
        }
        chain.doFilter(request, response);
    }
}
