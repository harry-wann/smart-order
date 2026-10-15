package tw.ispan.smartorder.reservation.dto.request

import jakarta.validation.constraints.NotNull

data class SeatReservationRequest(
    // 櫃檯自己選桌，可以不是訂位當初配到的那張，所以放 body；
    // 可為 null 的原因同 CreateReservationRequest
    @NotNull(message = "請選擇要開的桌")
    val tableId: Long?,
)
