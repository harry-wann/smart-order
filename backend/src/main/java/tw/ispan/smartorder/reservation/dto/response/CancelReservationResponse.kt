package tw.ispan.smartorder.reservation.dto.response

import tw.ispan.smartorder.reservation.enums.CancelSource
import tw.ispan.smartorder.reservation.enums.ReservationStatus
import java.time.OffsetDateTime

data class CancelReservationResponse(
    val reservationId: Long,
    val status: ReservationStatus,
    val cancelSource: CancelSource,
    val cancelledAt: OffsetDateTime,
)
