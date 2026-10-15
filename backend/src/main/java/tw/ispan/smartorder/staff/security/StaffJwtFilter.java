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
// 角色直接取自 JWT、不查資料庫：員工被停用或改角色後，舊權杖要等到過期（最多 12 小時）才失效。
// 跟 SessionTokenFilter 一樣用 new 加進 security chain，不要加 @Component，否則會被註冊兩次
public class StaffJwtFilter extends OncePerRequestFilter {

    private static final String BEARER = "Bearer ";

    private final StaffJwtProvider jwtProvider;

    public StaffJwtFilter(StaffJwtProvider jwtProvider) {
        this.jwtProvider = jwtProvider;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/admin/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
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
