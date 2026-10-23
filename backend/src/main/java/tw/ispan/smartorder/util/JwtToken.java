package tw.ispan.smartorder.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.UUID;

// 顧客端的兩種 JWT：會員登入（Authorization: Bearer）與同桌點餐的用餐權杖（X-Session-Token）。
// 金鑰從設定 app.customer-jwt.secret 讀（環境變數 CUSTOMER_JWT_SECRET），規則比照員工的 StaffJwtProvider：
// 以前金鑰直接寫在這個檔案裡，拿到原始碼的人就能簽出任何會員、任何一桌客人的權杖，
// 而同桌點餐的 WebSocket 連線只驗這張 JWT，所以改成啟動時注入、交給 Spring 管理。
// 兩種 token 用同一把金鑰，靠 typ 分開：會員的 token 不能拿來當用餐權杖，反過來也一樣。
@Component
public class JwtToken {
    public record GuestIdentity(Long sessionId, Long guestId) {}

    // 本機開發用的預設金鑰：寫在 repo 裡誰都看得到，只允許在 server.address 是本機時使用
    public static final String DEV_SECRET = "smart-order-local-dev-customer-jwt-secret-change-me";
    // HS256 至少要 32 bytes（256 bit），短於這個 jjwt 會丟英文的 WeakKeyException，先自己用中文擋下來
    private static final int MIN_SECRET_BYTES = 32;
    private static final String TYPE = "typ";
    private static final String MEMBER = "member";
    private static final String GUEST = "guest";
    private static final String GUEST_ID = "guestId";
    private static final String MEMBER_SUBJECT_PREFIX = "member:";
    // 用餐權杖 12 小時；會員 JWT 的效期由 MemberAuthService 決定（7 天）
    private static final Duration GUEST_TTL = Duration.ofHours(12);

    private final SecretKey key;

    public JwtToken(
            @Value("${app.customer-jwt.secret}") String secret,
            @Value("${server.address:0.0.0.0}") String serverAddress) throws UnknownHostException {
        // 預設金鑰是公開的，只能在只聽本機的開發環境用。部署時忘了設 CUSTOMER_JWT_SECRET，
        // 寧可讓應用程式起不來，也不要悄悄用這把公開的金鑰上線。
        // server.address 沒設的話預設 0.0.0.0（聽所有網卡），也會被擋
        if (DEV_SECRET.equals(secret) && !InetAddress.getByName(serverAddress).isLoopbackAddress()) {
            throw new IllegalArgumentException(
                    "server.address 不是本機時，一定要用環境變數 CUSTOMER_JWT_SECRET 設定會員與同桌點餐的 JWT 金鑰");
        }
        byte[] secretBytes = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalArgumentException(
                    "環境變數 CUSTOMER_JWT_SECRET 至少要 32 個字元，可以用 openssl rand -base64 48 產生");
        }
        this.key = Keys.hmacShaKeyFor(secretBytes);
    }

    // 用餐權杖（X-Session-Token）只說「坐哪一桌、自稱哪位 guest」；
    // 要動購物車或送單，還要再帶 X-Guest-Token 證明真的是那位 guest（見 GuestToken）。
    // 不再放 deviceId：裝置識別碼可偽造，不參與身分判斷。
    public String createGuestToken(Long sessionId, Long guestId) {
        return Jwts.builder().setSubject(sessionId.toString())
                .claim(TYPE, GUEST)
                .claim(GUEST_ID, guestId)
                .setId(UUID.randomUUID().toString())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + GUEST_TTL.toMillis()))
                .signWith(key).compact();
    }

    // 簽章不對、過期丟 JwtException；不是用餐權杖（例如拿會員 token 來）、格式不對丟 IllegalArgumentException。
    // 舊版權杖裡的 deviceId claim 直接忽略
    public GuestIdentity parseGuestToken(String token) {
        Claims claims = parse(token);
        if (!GUEST.equals(claims.get(TYPE)) || !(claims.get(GUEST_ID) instanceof Number guestId)) {
            throw new IllegalArgumentException("用餐憑證格式不符，請重新掃碼");
        }
        return new GuestIdentity(Long.valueOf(claims.getSubject()), guestId.longValue());
    }

    // 會員 JWT：sub 是 member:{id}，再加 typ=member
    public String createMemberToken(Long memberId, Duration ttl) {
        return Jwts.builder()
                .setSubject(MEMBER_SUBJECT_PREFIX + memberId)
                .claim(TYPE, MEMBER)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + ttl.toMillis()))
                .signWith(key)
                .compact();
    }

    // 解不出來的情況跟 parseGuestToken 一樣：JwtException 或 IllegalArgumentException（含 id 不是數字）
    public Long parseMemberId(String token) {
        Claims claims = parse(token);
        String subject = claims.getSubject();
        if (!MEMBER.equals(claims.get(TYPE)) || subject == null || !subject.startsWith(MEMBER_SUBJECT_PREFIX)) {
            throw new IllegalArgumentException("不是會員憑證");
        }
        return Long.valueOf(subject.substring(MEMBER_SUBJECT_PREFIX.length()));
    }

    private Claims parse(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
    }
}
