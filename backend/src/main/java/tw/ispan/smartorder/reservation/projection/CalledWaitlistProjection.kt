package tw.ispan.smartorder.reservation.projection

import java.time.LocalDateTime

interface CalledWaitlistProjection {
    fun getId(): Long
    fun getTicketNo(): String
    fun getContactName(): String
    fun getPartySize(): Int
    fun getCreatedAt(): LocalDateTime
}
