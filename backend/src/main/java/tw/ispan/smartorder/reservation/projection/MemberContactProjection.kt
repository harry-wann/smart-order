package tw.ispan.smartorder.reservation.projection

interface MemberContactProjection {
    fun getPhone(): String
    fun getNickname(): String?
}
