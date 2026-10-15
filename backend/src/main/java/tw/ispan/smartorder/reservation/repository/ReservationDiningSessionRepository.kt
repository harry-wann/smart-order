package tw.ispan.smartorder.reservation.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import tw.ispan.smartorder.entity.DiningSessionEntity

@Repository
interface ReservationDiningSessionRepository : JpaRepository<DiningSessionEntity, Long>
