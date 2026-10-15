package tw.ispan.smartorder.reservation.dto.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.OffsetDateTime

// 會員訂位不用填聯絡資料，所以姓名電話在這裡都是選填，由 service 依身分檢查
data class CreateReservationRequest(
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
