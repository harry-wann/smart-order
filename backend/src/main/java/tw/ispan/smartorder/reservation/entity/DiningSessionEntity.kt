package tw.ispan.smartorder.reservation.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.LocalDateTime

// 報到開桌時建立的用餐紀錄（＝這一桌的帳單）；點餐、結帳由其他工作包處理
@Entity
@Table(name = "dining_session")
class DiningSessionEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,
    var tableId: Long? = null,
    var memberId: Long? = null,
    var reservationId: Long? = null,
    var waitlistId: Long? = null,
    var sessionToken: String? = null,
    var adultCount: Int = 0,
    var childCount: Int = 0,
    // OPEN / PAID / CANCELLED
    var status: String = "OPEN",
    var subtotal: BigDecimal = BigDecimal.ZERO,
    var serviceFee: BigDecimal = BigDecimal.ZERO,
    var total: BigDecimal = BigDecimal.ZERO,
    var cartVersion: Long = 0,
    var openedAt: LocalDateTime? = null,
    var closedAt: LocalDateTime? = null,
    @Column(insertable = false, updatable = false)
    var createdAt: LocalDateTime? = null,
    @Column(insertable = false, updatable = false)
    var updatedAt: LocalDateTime? = null,
)
