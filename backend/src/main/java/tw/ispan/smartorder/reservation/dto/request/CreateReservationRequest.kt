package tw.ispan.smartorder.reservation.dto.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.OffsetDateTime

// 會員訂位不用填聯絡資料，所以姓名電話在這裡都是選填，由 service 依身分檢查。
// startTime、adultCount 明明必填卻宣告成可為 null：Kotlin 的非 null 欄位漏填時，
// Jackson 在反序列化就先丟錯了，前端只拿到「請求格式不正確」；
// 改成可為 null，漏填才會由 @NotNull 回「請選擇訂位時段」這種貼在欄位上的訊息，service 再用 !! 取值
data class CreateReservationRequest(
    // 帶 +08:00 的 ISO 時間，service 轉成店家時區再檢查是不是營業時段內的整點或半點
    @NotNull(message = "請選擇訂位時段")
    val startTime: OffsetDateTime?,
    @NotNull(message = "請填寫人數")
    @Min(value = 1, message = "大人至少 1 位")
    @Max(value = 20, message = "人數太多，請來電訂位")
    val adultCount: Int?,
    @Min(value = 0, message = "小孩人數不能是負數")
    @Max(value = 20, message = "人數太多，請來電訂位")
    val childCount: Int? = 0,
    @Size(max = 50, message = "姓名最多 50 字")
    val contactName: String? = null,
    @Pattern(regexp = "^09\\d{8}$", message = "手機號碼格式為 09 開頭共 10 碼")
    val contactPhone: String? = null,
    @Email(message = "電子信箱格式不正確")
    @Size(max = 100, message = "電子信箱最多 100 字")
    val contactEmail: String? = null,
)
