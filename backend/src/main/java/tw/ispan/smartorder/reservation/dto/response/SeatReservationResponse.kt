package tw.ispan.smartorder.reservation.dto.response

data class SeatReservationResponse(
    val diningSessionId: Long,
    val tableNo: String,
    val adultCount: Int,
    val childCount: Int,
    // 預先點餐轉單（進階 A2）用；沒有預點就是 null 與空陣列
    val preorderTicketId: Long?,
    val soldOut: List<SoldOutItem>,
)

data class SoldOutItem(
    val name: String,
    val quantity: Int,
    val reason: String,
)
