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
    @NotNull
    val startTime: OffsetDateTime?,
    @NotNull
    @Min(1)
    @Max(20)
    val adultCount: Int?,
    @Min(0)
    @Max(20)
    val childCount: Int? = 0,
    @Size(max = 50)
    val contactName: String? = null,
    @Pattern(regexp = "^09\\d{8}$", message = "手機號碼格式為 09 開頭共 10 碼")
    val contactPhone: String? = null,
    @Email
    @Size(max = 100)
    val contactEmail: String? = null,
)
