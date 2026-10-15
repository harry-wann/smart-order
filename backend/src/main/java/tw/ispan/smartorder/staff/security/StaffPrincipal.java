package tw.ispan.smartorder.staff.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

// 原檔名 StaffPrincipal.kt

// 從 JWT 解出來放進 SecurityContext 的員工資料，只有這三樣，要更多再去查資料庫。
// role 是 COUNTER 這種原始值，沒有 ROLE_ 前綴；StaffJwtFilter 組 authority 時才加，
// SecurityConfig 的 hasRole("MANAGER") 比對的是 ROLE_MANAGER
public record StaffPrincipal(
        Long id,
        String displayName,
        String role
) {

    // 有帶員工 JWT 的請求才拿得到；受保護的端點一定有，因為沒帶會先被擋成 401
    public static StaffPrincipal current() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof StaffPrincipal principal) {
            return principal;
        }
        return null;
    }
}
