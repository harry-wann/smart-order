// dto/MemberProfileResponse.java
package tw.ispan.smartorder.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record MemberProfileResponse(
				String phone,
				String nickname,
				String gender,
				LocalDate birthDate,
				LocalDateTime createdAt
) {}