package tw.ispan.smartorder.reservation.security

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component
import tw.ispan.smartorder.service.MemberAuthService

// 從會員 JWT 解出會員 id，解析交給 MemberAuthService（工作包 A）。
// 回 null 就是匿名：沒帶 header、格式不對、過期、竄改、拿點餐 token 來冒充都一樣，
// 訂位那邊改用 accessToken 判斷。
// 這裡只解析 id，不查會員存不存在：建立訂位時 fillContact 會查，
// 查詢、取消則是拿 id 跟訂位的 member_id 比，對不上就是 404。
@Component
class MemberIdentityResolver(
    private val memberAuthService: MemberAuthService,
) {
    fun memberId(request: HttpServletRequest): Long? {
        return memberAuthService.memberIdOrNull(request.getHeader(HttpHeaders.AUTHORIZATION))
    }
}