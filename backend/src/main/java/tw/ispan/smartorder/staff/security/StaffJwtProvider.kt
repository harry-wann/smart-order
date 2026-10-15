package tw.ispan.smartorder.staff.security

import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.net.InetAddress
import java.time.Duration
import java.time.Instant
import java.util.Date

// 員工 JWT：效期 12 小時（一個班），跟顧客的用餐權杖用不同的金鑰
@Component
class StaffJwtProvider(
    @Value("\${app.staff-jwt.secret}") secret: String,
    @Value("\${app.staff-jwt.ttl:PT12H}") private val ttl: Duration,
    @Value("\${server.address:0.0.0.0}") serverAddress: String,
) {
    init {
        // 預設金鑰寫在 repo 裡，誰都能拿來簽 MANAGER 權杖；只允許在只聽本機的開發環境用
        require(secret != DEV_SECRET || InetAddress.getByName(serverAddress).isLoopbackAddress) {
            "server.address 不是本機時，一定要用環境變數 STAFF_JWT_SECRET 設定員工 JWT 金鑰"
        }
    }

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
        const val DEV_SECRET = "smart-order-local-dev-staff-jwt-secret-change-me"
        private const val TYPE = "typ"
        private const val STAFF = "staff"
        private const val NAME = "name"
        private const val ROLE = "role"
    }
}
