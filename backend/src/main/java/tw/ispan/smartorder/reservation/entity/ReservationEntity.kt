package tw.ispan.smartorder.reservation.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import tw.ispan.smartorder.reservation.enums.CancelSource
import tw.ispan.smartorder.reservation.enums.ReservationStatus
import java.time.LocalDateTime

@Entity
@Table(name = "reservation")
class ReservationEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,
    var reservationNo: String? = null,
    var memberId: Long? = null,
    var contactName: String? = null,
    var contactPhone: String? = null,
    var contactEmail: String? = null,
    var startTime: LocalDateTime? = null,
    // start + 用餐 100 分 + 清桌 15 分
    var endTime: LocalDateTime? = null,
    var adultCount: Int = 0,
    var childCount: Int = 0,
    var partySize: Int = 0,
    // 訂位當下配到的桌，只用在容量與重疊判斷；報到時坐別張桌也不改它
    var tableId: Long? = null,
    @Enumerated(EnumType.STRING)
    var status: ReservationStatus = ReservationStatus.CONFIRMED,
    var accessToken: String? = null,
    var cancelledAt: LocalDateTime? = null,
    var cancelledByStaffId: Long? = null,
    @Enumerated(EnumType.STRING)
    var cancelSource: CancelSource? = null,
    @Column(insertable = false, updatable = false)
    var createdAt: LocalDateTime? = null,
    @Column(insertable = false, updatable = false)
    var updatedAt: LocalDateTime? = null,
) {
    // table_id 清成 NULL 才會釋放 UNIQUE(table_id, start_time)，那個時段的名額跟著回來
    fun cancel(source: CancelSource, staffId: Long?, now: LocalDateTime) {
        status = ReservationStatus.CANCELLED
        cancelledAt = now
        cancelSource = source
        cancelledByStaffId = staffId
        tableId = null
    }
}
