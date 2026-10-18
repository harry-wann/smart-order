package tw.ispan.smartorder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SendCodeRequest(
				@NotBlank(message="請輸入手機號碼")
				@Pattern(regexp="^09\\d{8}$",message = "手機號碼格是不正確")
				String phone
) {
}
