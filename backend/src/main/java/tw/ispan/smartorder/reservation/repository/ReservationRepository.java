package tw.ispan.smartorder.reservation.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tw.ispan.smartorder.entity.ReservationEntity;
import tw.ispan.smartorder.reservation.enums.ReservationStatus;
import tw.ispan.smartorder.reservation.projection.CalledWaitlistProjection;
import tw.ispan.smartorder.reservation.projection.MemberContactProjection;
import tw.ispan.smartorder.reservation.projection.SeatedTableProjection;

@Repository
public interface ReservationRepository extends JpaRepository<ReservationEntity, Long> {

    // 這幾張桌在 [from, to) 這段時間被哪些訂位佔著，查時段和建立訂位（鎖住之後）都用這支。
    // 重疊是 start < :to 且 end > :from（M7 7.2），用 < 不用 <=：
    // 前一組的 end 剛好等於下一組的 start 是「剛好接續」，不算重疊。
    // 會佔位的只有 CONFIRMED，和已報到但還沒結帳的 SEATED（dining_session 還是 OPEN）；
    // 客人結帳或取消用餐後名額就放出來，不用等到 end_time。CANCELLED、NO_SHOW 不算
    @Query(nativeQuery = true, value = """
            select r.* from reservation r
            where r.table_id in (:tableIds)
              and r.start_time < :to and r.end_time > :from
              and (r.status = 'CONFIRMED'
                   or (r.status = 'SEATED' and exists (
                         select 1 from dining_session s
                         where s.reservation_id = r.id and s.status = 'OPEN')))
            """)
    List<ReservationEntity> findOccupying(
            @Param("tableIds") Collection<Long> tableIds,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    // 取消、報到會搶同一筆，先鎖住再檢查狀態；MySQL 5.7 要用原生的 FOR UPDATE，
    // 原因跟 DiningTableRepository.findReservableForUpdate 一樣
    @Query(nativeQuery = true, value = "select * from reservation where id = :id for update")
    ReservationEntity findByIdForUpdate(@Param("id") Long id);

    List<ReservationEntity> findByMemberIdOrderByStartTimeDesc(Long memberId);

    // S-08 改座位數、停用桌位：配到這張桌、還沒結束的訂位，最早的排前面
    List<ReservationEntity> findByTableIdAndStatusAndEndTimeAfterOrderByStartTimeAsc(
            Long tableId,
            ReservationStatus status,
            LocalDateTime now);

    List<ReservationEntity> findByStartTimeGreaterThanEqualAndStartTimeLessThanOrderByStartTimeAscIdAsc(
            LocalDateTime from,
            LocalDateTime to);

    List<ReservationEntity> findByStatusAndTableIdIsNotNullAndStartTimeGreaterThanEqualAndStartTimeLessThanEqual(
            ReservationStatus status,
            LocalDateTime from,
            LocalDateTime to);

    List<ReservationEntity> findByStatusAndStartTimeGreaterThanEqualAndStartTimeLessThanEqualAndPartySizeLessThanEqualOrderByStartTimeAsc(
            ReservationStatus status,
            LocalDateTime from,
            LocalDateTime to,
            int maxPartySize);

    // 候位屬於工作包 D，這裡只讀「已叫號」的組別給開桌頁看。
    // 欄位別名要跟 projection 的 getter 名字對上（ticket_no as ticketNo）
    @Query(nativeQuery = true, value = """
            select id, ticket_no as ticketNo, contact_name as contactName, party_size as partySize, created_at as createdAt
            from waitlist where status = 'CALLED' and party_size <= :seats
            order by called_at
            """)
    List<CalledWaitlistProjection> findCalledWaitlist(@Param("seats") int seats);

    List<ReservationEntity> findByStatusAndStartTimeGreaterThanEqualAndStartTimeLessThan(
            ReservationStatus status,
            LocalDateTime from,
            LocalDateTime to);

    // 報到後客人實際坐哪張桌記在 dining_session，不在 reservation.table_id
    @Query(nativeQuery = true, value = """
            select s.reservation_id as reservationId, t.table_no as tableNo
            from dining_session s join dining_table t on t.id = s.table_id
            where s.reservation_id in (:reservationIds)
            """)
    List<SeatedTableProjection> findSeatedTables(@Param("reservationIds") Collection<Long> reservationIds);

    // 過了保留時間還沒報到；桌位不用動，保留是算出來的，時間一過就自己消失。
    // status 是 enum，用參數傳，不在 JPQL 裡直接寫 'NO_SHOW' 這類字面值，避免字串跟 enum 型別對不上
    @Modifying
    @Query("""
            update ReservationEntity r set r.status = :noShow
            where r.status = :confirmed and r.startTime < :cutoff
            """)
    int markNoShowBefore(
            @Param("cutoff") LocalDateTime cutoff,
            @Param("confirmed") ReservationStatus confirmed,
            @Param("noShow") ReservationStatus noShow);

    // 會員那邊（工作包 A）還沒有 entity，用原生 SQL 只讀需要的兩欄。
    // 只查 ACTIVE：停權的會員查不到，ReservationService.fillContact 會當成身分無效
    @Query(nativeQuery = true, value = "select phone, nickname from member where id = :memberId and status = 'ACTIVE'")
    MemberContactProjection findMemberContact(@Param("memberId") Long memberId);
}
