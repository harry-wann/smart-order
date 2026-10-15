package tw.ispan.smartorder.reservation.dto.response

import java.time.LocalDate

data class AvailabilityResponse(
    val date: LocalDate,
    val diningMinutes: Long,
    val bufferMinutes: Long,
    val slots: List<SlotResponse>,
)

data class SlotResponse(
    // HH:mm
    val time: String,
    val available: Boolean,
    val remainingTables: Int,
)
