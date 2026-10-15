package tw.ispan.smartorder.reservation.dto.request

import jakarta.validation.constraints.NotNull

data class SeatReservationRequest(
    @NotNull(message = "請選擇要開的桌")
    val tableId: Long?,
)
