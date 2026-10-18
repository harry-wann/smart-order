package tw.ispan.smartorder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyCodeRequest(
				@NotBlank(message = "請輸入手機號碼")
				@Pattern(regexp = "^09\\d{8}$", message = "手機號碼格式錯誤")
				String phone,

				@NotBlank(message = "請輸入驗證碼")
				@Pattern(regexp = "^\\d{6}$", message = "驗證碼為 6 位數字")
				String code
) {}
