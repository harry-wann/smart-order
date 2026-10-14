package tw.ispan.smartorder.staff.service

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tw.ispan.smartorder.common.exception.ApiException
import tw.ispan.smartorder.staff.dto.request.StaffLoginRequest
import tw.ispan.smartorder.staff.dto.response.StaffLoginResponse
import tw.ispan.smartorder.staff.dto.response.StaffResponse
import tw.ispan.smartorder.staff.repository.StaffRepository
import tw.ispan.smartorder.staff.security.StaffJwtProvider
import tw.ispan.smartorder.staff.security.StaffPrincipal
import java.time.ZoneId

@Service
class StaffAuthService(
    private val staffRepo: StaffRepository,
    private val jwtProvider: StaffJwtProvider,
) {
    private val passwordEncoder = BCryptPasswordEncoder()

    @Transactional(readOnly = true)
    fun login(request: StaffLoginRequest): StaffLoginResponse {
        val staff = staffRepo.findByUsernameAndActiveTrue(request.username.trim())
        // 帳號不存在跟密碼錯回一樣的訊息，不透露哪個帳號存在
        if (staff == null || !passwordEncoder.matches(request.password, staff.passwordHash)) {
            throw ApiException.unauthorized("帳號或密碼錯誤")
        }
        val principal = StaffPrincipal(staff.id!!, staff.displayName!!, staff.role!!)
        val (token, expiresAt) = jwtProvider.create(principal)
        return StaffLoginResponse(
            token = token,
            expiresAt = expiresAt.atZone(ZONE).toOffsetDateTime(),
            staff = StaffResponse(principal.id, principal.displayName, principal.role),
        )
    }

    companion object {
        private val ZONE = ZoneId.of("Asia/Taipei")
    }
}
