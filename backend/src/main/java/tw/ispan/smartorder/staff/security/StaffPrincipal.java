package tw.ispan.smartorder.staff.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

// 原檔名 StaffPrincipal.kt

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
