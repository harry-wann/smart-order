package tw.ispan.smartorder.staff.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

// 原檔名 StaffJwtProvider.kt

// 員工 JWT：效期 12 小時（一個班），跟顧客的用餐權杖用不同的金鑰。
// 會員之後也是 Authorization: Bearer 的 JWT，標頭長得一樣，所以 token 裡放 typ=staff，
// parse 時不是 staff 的一律不認，會員的 token 拿來打 /api/admin 才不會被當成員工。
// 名字、角色直接簽進 token，驗證時不用查資料庫
@Component
public class StaffJwtProvider {

    public static final String DEV_SECRET = "smart-order-local-dev-staff-jwt-secret-change-me";
    private static final String TYPE = "typ";
    private static final String STAFF = "staff";
    private static final String NAME = "name";
    private static final String ROLE = "role";

    private final Duration ttl;
    private final SecretKey key;

    public StaffJwtProvider(
            @Value("${app.staff-jwt.secret}") String secret,
            @Value("${app.staff-jwt.ttl:PT12H}") Duration ttl,
            @Value("${server.address:0.0.0.0}") String serverAddress) throws UnknownHostException {
        // 預設金鑰寫在 repo 裡，誰都能拿來簽 MANAGER 權杖；只允許在只聽本機的開發環境用。
        // 部署時忘了設 STAFF_JWT_SECRET，寧可讓應用程式起不來，也不要悄悄用這把公開的金鑰上線。
        // server.address 沒設的話預設 0.0.0.0（聽所有網卡），也會被擋
        if (DEV_SECRET.equals(secret) && !InetAddress.getByName(serverAddress).isLoopbackAddress()) {
            throw new IllegalArgumentException("server.address 不是本機時，一定要用環境變數 STAFF_JWT_SECRET 設定員工 JWT 金鑰");
        }
        this.ttl = ttl;
        // 金鑰短於 32 bytes（256 bit）時 jjwt 會直接丟 WeakKeyException，啟動就失敗，所以設定檔寫至少 32 字元
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public IssuedToken create(StaffPrincipal principal) {
        return create(principal, Instant.now());
    }

    public IssuedToken create(StaffPrincipal principal, Instant now) {
        Instant expiresAt = now.plus(ttl);
        String token = Jwts.builder()
                .setSubject(principal.id().toString())
                .claim(TYPE, STAFF)
                .claim(NAME, principal.displayName())
                .claim(ROLE, principal.role())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiresAt))
                .signWith(key)
                .compact();
        return new IssuedToken(token, expiresAt);
    }

    // 簽章不對、過期、不是員工權杖都當作沒登入。
    // 回 null 不丟例外：這裡只認人，認不出來就當匿名，要不要擋由 SecurityConfig 的規則決定
    // （需要登入的路徑會回 401）。IllegalArgumentException、ClassCastException 是空字串、
    // sub 不是數字、claim 型別不對這類壞掉的 token
    public StaffPrincipal parse(String token) {
        try {
            Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
            if (!STAFF.equals(claims.get(TYPE))) {
                return null;
            }
            return new StaffPrincipal(
                    Long.valueOf(claims.getSubject()),
                    (String) claims.get(NAME),
                    (String) claims.get(ROLE));
        } catch (JwtException | IllegalArgumentException | ClassCastException e) {
            return null;
        }
    }

    public record IssuedToken(String token, Instant expiresAt) {
    }
}
