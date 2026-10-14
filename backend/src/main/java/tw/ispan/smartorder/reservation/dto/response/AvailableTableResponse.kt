package tw.ispan.smartorder.reservation.dto.response

data class AvailableTableResponse(
    val tableId: Long,
    val tableNo: String,
    val area: String,
    val seats: Int,
    // 115 分鐘內別筆訂位的開始時間（HH:mm），只提醒不擋
    val upcomingReservationAt: String?,
    // 從 S-07 報到時，這筆訂位自己的保留桌
    val isOwnHold: Boolean,
)
