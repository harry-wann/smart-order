package tw.ispan.smartorder.staff.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import tw.ispan.smartorder.staff.entity.StaffEntity

@Repository
interface StaffRepository : JpaRepository<StaffEntity, Long> {
    fun findByUsernameAndActiveTrue(username: String): StaffEntity?
}
