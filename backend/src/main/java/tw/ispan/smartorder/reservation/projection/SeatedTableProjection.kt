package tw.ispan.smartorder.reservation.projection

interface SeatedTableProjection {
    fun getReservationId(): Long
    fun getTableNo(): String
}
