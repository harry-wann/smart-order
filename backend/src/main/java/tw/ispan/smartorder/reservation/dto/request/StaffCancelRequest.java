package tw.ispan.smartorder.reservation.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class StaffCancelRequest {
    // 只寫進日誌，資料表不存
    @Size(max = 100, message = "原因最多 100 字")
    private String reason;
}
