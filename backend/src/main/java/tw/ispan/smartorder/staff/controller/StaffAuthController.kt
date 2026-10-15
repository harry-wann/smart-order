package tw.ispan.smartorder.staff.controller

import jakarta.validation.Valid
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import tw.ispan.smartorder.staff.dto.request.StaffLoginRequest
import tw.ispan.smartorder.staff.dto.response.StaffLoginResponse
import tw.ispan.smartorder.staff.service.StaffAuthService

@RestController
@RequestMapping("/api/admin/auth")
class StaffAuthController(
    private val service: StaffAuthService,
) {

    @PostMapping("/login")
    fun login(@Valid @RequestBody request: StaffLoginRequest): StaffLoginResponse {
        return service.login(request)
    }
}
