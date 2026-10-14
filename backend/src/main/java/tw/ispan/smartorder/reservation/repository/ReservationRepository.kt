package tw.ispan.smartorder.reservation.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import tw.ispan.smartorder.reservation.entity.ReservationEntity
import tw.ispan.smartorder.reservation.projection.MemberContactProjection
import java.time.LocalDateTime

@Repository
interface ReservationRepository : JpaRepository<ReservationEntity, Long> {

    // 會佔位的只有 CONFIRMED，和已報到但還沒結帳的 SEATED；用 < 比較，剛好接續不算重疊
    @Query(
        nativeQuery = true,
        value = """
        select r.* from reservation r
        where r.table_id in (:tableIds)
          and r.start_time < :to and r.end_time > :from
          and (r.status = 'CONFIRMED'
               or (r.status = 'SEATED' and exists (
                     select 1 from dining_session s
                     where s.reservation_id = r.id and s.status = 'OPEN')))
        """
    )
    fun findOccupying(tableIds: Collection<Long>, from: LocalDateTime, to: LocalDateTime): List<ReservationEntity>

    // 取消、報到會搶同一筆，先鎖住再檢查狀態；MySQL 5.7 要用原生的 FOR UPDATE
    @Query(nativeQuery = true, value = "select * from reservation where id = :id for update")
    fun findByIdForUpdate(id: Long): ReservationEntity?

    fun findByMemberIdOrderByStartTimeDesc(memberId: Long): List<ReservationEntity>

    @Query(
        nativeQuery = true,
        value = "select phone, nickname from member where id = :memberId and status = 'ACTIVE'"
    )
    fun findMemberContact(memberId: Long): MemberContactProjection?
}
