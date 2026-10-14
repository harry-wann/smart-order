package tw.ispan.smartorder.reservation.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "dining_table")
class DiningTableEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,
    var tableNo: String? = null,
    var seats: Int = 0,
    var area: String? = null,
    // AVAILABLE / OCCUPIED / CLEANING；預約保留是算出來的，不存在這裡
    var status: String? = null,
    var reservable: Boolean = true,
    var active: Boolean = true,
    @Column(insertable = false, updatable = false)
    var createdAt: LocalDateTime? = null,
    @Column(insertable = false, updatable = false)
    var updatedAt: LocalDateTime? = null,
)
