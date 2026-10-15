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

// 員工 JWT：效期 12 小時（一個班），跟顧客的用餐權杖用不同的金鑰
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
        // 預設金鑰寫在 repo 裡，誰都能拿來簽 MANAGER 權杖；只允許在只聽本機的開發環境用
        if (DEV_SECRET.equals(secret) && !InetAddress.getByName(serverAddress).isLoopbackAddress()) {
            throw new IllegalArgumentException("server.address 不是本機時，一定要用環境變數 STAFF_JWT_SECRET 設定員工 JWT 金鑰");
        }
        this.ttl = ttl;
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

    // 簽章不對、過期、不是員工權杖都當作沒登入
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
