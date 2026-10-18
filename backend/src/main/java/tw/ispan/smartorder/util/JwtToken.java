package tw.ispan.smartorder.util;

import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;


import java.security.Key;
import java.util.Date;

public class JwtToken {
    public record GuestIdentity(Long sessionId, Long guestId, String deviceId) {}

    public static String createGuestToken(Long sessionId, Long guestId, String deviceId) {
        return Jwts.builder().setSubject(sessionId.toString())
                .claim("guestId", guestId).claim("deviceId", deviceId)
                .setId(java.util.UUID.randomUUID().toString())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 12 * 60 * 60 * 1000L))
                .signWith(key).compact();
    }

    public static GuestIdentity parseGuestToken(String token, String deviceId) {
        var claims = Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody();
        if (deviceId == null || deviceId.isBlank() || !deviceId.equals(claims.get("deviceId"))
                || !(claims.get("guestId") instanceof Number guestId)) {
            throw new IllegalArgumentException("客人憑證與裝置不符，請重新掃碼");
        }
        return new GuestIdentity(Long.valueOf(claims.getSubject()), guestId.longValue(), deviceId);
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

	public static String parseToken(String token){
		JwtParser parser=Jwts.parserBuilder().setSigningKey(key).build();
		String subject=parser.parseClaimsJws(token).getBody().getSubject();
		return subject;
	}

}
