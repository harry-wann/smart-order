package tw.ispan.smartorder.staff.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// 原檔名 StaffLoginRequest.kt

public record StaffLoginRequest(
        @NotBlank(message = "請輸入帳號")
        @Size(max = 50)
        String username,

        @NotBlank(message = "請輸入密碼")
        @Size(max = 100)
        String password
) {
}
