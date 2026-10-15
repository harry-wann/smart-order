package tw.ispan.smartorder.reservation.enums

// 誰取消的。STAFF 時 reservation.cancelled_by_staff_id 一定有值，CUSTOMER 時是 NULL
enum class CancelSource {
    CUSTOMER, STAFF
}
