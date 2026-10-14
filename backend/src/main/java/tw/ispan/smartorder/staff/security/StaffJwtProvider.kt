package tw.ispan.smartorder.staff.security

import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.time.Duration
import java.time.Instant
import java.util.Date

// 員工 JWT：效期 12 小時（一個班），跟顧客的用餐權杖用不同的金鑰
@Component
class StaffJwtProvider(
    @Value("\${app.staff-jwt.secret}") secret: String,
    @Value("\${app.staff-jwt.ttl:PT12H}") private val ttl: Duration,
) {
    private val key = Keys.hmacShaKeyFor(secret.toByteArray())

    fun create(principal: StaffPrincipal, now: Instant = Instant.now()): Pair<String, Instant> {
        val expiresAt = now.plus(ttl)
        val token = Jwts.builder()
            .setSubject(principal.id.toString())
            .claim(TYPE, STAFF)
            .claim(NAME, principal.displayName)
            .claim(ROLE, principal.role)
            .setIssuedAt(Date.from(now))
            .setExpiration(Date.from(expiresAt))
            .signWith(key)
            .compact()
        return token to expiresAt
    }

    // 簽章不對、過期、不是員工權杖都當作沒登入
    fun parse(token: String): StaffPrincipal? {
        return try {
            val claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).body
            if (claims[TYPE] != STAFF) return null
            StaffPrincipal(claims.subject.toLong(), claims[NAME] as String, claims[ROLE] as String)
        } catch (e: JwtException) {
            null
        } catch (e: IllegalArgumentException) {
            null
        }
    }

    companion object {
        private const val TYPE = "typ"
        private const val STAFF = "staff"
        private const val NAME = "name"
        private const val ROLE = "role"
    }
}
