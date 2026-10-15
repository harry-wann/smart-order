package tw.ispan.smartorder.reservation.repository

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import tw.ispan.smartorder.entity.ReservationEntity
import tw.ispan.smartorder.reservation.enums.ReservationStatus
import tw.ispan.smartorder.reservation.projection.CalledWaitlistProjection
import tw.ispan.smartorder.reservation.projection.MemberContactProjection
import tw.ispan.smartorder.reservation.projection.SeatedTableProjection
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

    fun findByStartTimeGreaterThanEqualAndStartTimeLessThanOrderByStartTimeAscIdAsc(
        from: LocalDateTime,
        to: LocalDateTime,
    ): List<ReservationEntity>

    fun findByStatusAndTableIdIsNotNullAndStartTimeGreaterThanEqualAndStartTimeLessThanEqual(
        status: ReservationStatus,
        from: LocalDateTime,
        to: LocalDateTime,
    ): List<ReservationEntity>

    fun findByStatusAndStartTimeGreaterThanEqualAndStartTimeLessThanEqualAndPartySizeLessThanEqualOrderByStartTimeAsc(
        status: ReservationStatus,
        from: LocalDateTime,
        to: LocalDateTime,
        maxPartySize: Int,
    ): List<ReservationEntity>

    // 候位屬於工作包 D，這裡只讀「已叫號」的組別給開桌頁看
    @Query(
        nativeQuery = true,
        value = """
        select id, ticket_no as ticketNo, contact_name as contactName, party_size as partySize, created_at as createdAt
        from waitlist where status = 'CALLED' and party_size <= :seats
        order by called_at
        """
    )
    fun findCalledWaitlist(seats: Int): List<CalledWaitlistProjection>

    fun findByStatusAndStartTimeGreaterThanEqualAndStartTimeLessThan(
        status: ReservationStatus,
        from: LocalDateTime,
        to: LocalDateTime,
    ): List<ReservationEntity>

    // 報到後客人實際坐哪張桌記在 dining_session，不在 reservation.table_id
    @Query(
        nativeQuery = true,
        value = """
        select s.reservation_id as reservationId, t.table_no as tableNo
        from dining_session s join dining_table t on t.id = s.table_id
        where s.reservation_id in (:reservationIds)
        """
    )
    fun findSeatedTables(reservationIds: Collection<Long>): List<SeatedTableProjection>

    // 過了保留時間還沒報到；桌位不用動，保留是算出來的，時間一過就自己消失
    @Modifying
    @Query(
        """
        update ReservationEntity r set r.status = :noShow
        where r.status = :confirmed and r.startTime < :cutoff
        """
    )
    fun markNoShowBefore(cutoff: LocalDateTime, confirmed: ReservationStatus, noShow: ReservationStatus): Int

    @Query(
        nativeQuery = true,
        value = "select phone, nickname from member where id = :memberId and status = 'ACTIVE'"
    )
    fun findMemberContact(memberId: Long): MemberContactProjection?
}
