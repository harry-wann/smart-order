package tw.ispan.smartorder.reservation.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// 會員訂位不用填聯絡資料，所以姓名電話在這裡都是選填，由 service 依身分檢查。
// 必填欄位使用 nullable wrapper，漏填時由 @NotNull 回傳貼在欄位上的訊息，service 再檢查取值。
@Getter
@Setter
@NoArgsConstructor
public class CreateReservationRequest {
    // 帶 +08:00 的 ISO 時間，service 轉成店家時區再檢查是不是在可訂的開始時間範圍內、而且精確到分鐘
    @NotNull(message = "請選擇訂位時段")
    private OffsetDateTime startTime;

    @NotNull(message = "請填寫人數")
    @Min(value = 1, message = "大人至少 1 位")
    @Max(value = 20, message = "人數太多，請來電訂位")
    private Integer adultCount;

    @Min(value = 0, message = "小孩人數不能是負數")
    @Max(value = 20, message = "人數太多，請來電訂位")
    private Integer childCount = 0;

    @Size(max = 50, message = "姓名最多 50 字")
    private String contactName;

    @Pattern(regexp = "^09\\d{8}$", message = "手機號碼格式為 09 開頭共 10 碼")
    private String contactPhone;

    @Email(message = "電子信箱格式不正確")
    @Size(max = 100, message = "電子信箱最多 100 字")
    private String contactEmail;
}
