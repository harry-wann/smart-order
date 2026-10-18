package tw.ispan.smartorder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ServiceCallRequest(
				@NotBlank
				@Pattern(regexp = "CALL_WAITER|ADD_SOUP|CHANGE_POT", message = "服務類型錯誤")
				String type) {
}