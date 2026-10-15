package tw.ispan.smartorder.staff.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "staff")
class StaffEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null,
    var username: String? = null,
    // BCrypt
    var passwordHash: String? = null,
    var displayName: String? = null,
    // COUNTER / KITCHEN / MANAGER
    var role: String? = null,
    var active: Boolean = true,
    @Column(insertable = false, updatable = false)
    var createdAt: LocalDateTime? = null,
    @Column(insertable = false, updatable = false)
    var updatedAt: LocalDateTime? = null,
)
