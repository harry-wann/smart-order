package tw.ispan.smartorder.staff.dto.request

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class StaffLoginRequest(
    @NotBlank(message = "請輸入帳號")
    @Size(max = 50)
    val username: String,
    @NotBlank(message = "請輸入密碼")
    @Size(max = 100)
    val password: String,
)
