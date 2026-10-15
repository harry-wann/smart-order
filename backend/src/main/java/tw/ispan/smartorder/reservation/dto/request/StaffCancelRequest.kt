package tw.ispan.smartorder.reservation.dto.request

import jakarta.validation.constraints.Size

data class StaffCancelRequest(
    // 只寫進日誌，資料表不存
    @Size(max = 100, message = "原因最多 100 字")
    val reason: String? = null,
)
