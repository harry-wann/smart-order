package tw.ispan.smartorder.util;

import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;


import java.security.Key;
import java.time.Duration;
import java.util.Date;

public class JwtToken {
    public record GuestIdentity(Long sessionId, Long guestId) {}

    // 用餐權杖（X-Session-Token）只說「坐哪一桌、自稱哪位 guest」；
    // 要動購物車或送單，還要再帶 X-Guest-Token 證明真的是那位 guest（見 GuestToken）。
    // 不再放 deviceId：裝置識別碼可偽造，不參與身分判斷。
    public static String createGuestToken(Long sessionId, Long guestId) {
        return Jwts.builder().setSubject(sessionId.toString())
                .claim("guestId", guestId)
                .setId(java.util.UUID.randomUUID().toString())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 12 * 60 * 60 * 1000L))
                .signWith(key).compact();
    }

    // 舊版權杖裡的 deviceId claim 直接忽略
    public static GuestIdentity parseGuestToken(String token) {
        var claims = Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody();
        if (!(claims.get("guestId") instanceof Number guestId)) {
            throw new IllegalArgumentException("用餐憑證格式不符，請重新掃碼");
        }
        return new GuestIdentity(Long.valueOf(claims.getSubject()), guestId.longValue());
    }
	private static final String SECRET = "asdfghjklvasdaswfesasdasdcvwsasdaddasdwfszxcd";
	private static final long EXP_TIME=60*60*1000;
	private static Key key= Keys.hmacShaKeyFor(SECRET.getBytes());

	public static String createToken(String subject){
		String token= Jwts.builder()
						.setSubject(subject)
						.setIssuedAt(new Date())
						.setExpiration(new Date(System.currentTimeMillis()+EXP_TIME))
						.signWith(key)
						.compact();
		return token;
	}

	// 效期由呼叫的人決定：會員 JWT 是 7 天（見 MemberAuthService），上面那支固定 1 小時不適用
	public static String createToken(String subject, Duration ttl){
		return Jwts.builder()
						.setSubject(subject)
						.setIssuedAt(new Date())
						.setExpiration(new Date(System.currentTimeMillis()+ttl.toMillis()))
						.signWith(key)
						.compact();
	}

	public static String parseToken(String token){
		JwtParser parser=Jwts.parserBuilder().setSigningKey(key).build();
		String subject=parser.parseClaimsJws(token).getBody().getSubject();
		return subject;
	}

}
