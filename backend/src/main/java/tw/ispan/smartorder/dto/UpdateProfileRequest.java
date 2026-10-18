// dto/UpdateProfileRequest.java
package tw.ispan.smartorder.dto;

import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record UpdateProfileRequest(
				@Size(max = 50, message = "名字最多 50 個字")
				String nickname,

				@Pattern(regexp = "MALE|FEMALE|OTHER", message = "性別格式錯誤")
				String gender,

				@Past(message = "生日不能是未來的日期")
				LocalDate birthDate
) {}