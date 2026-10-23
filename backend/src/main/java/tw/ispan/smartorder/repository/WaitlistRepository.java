package tw.ispan.smartorder.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.ispan.smartorder.entity.WaitlistEntity;

public interface WaitlistRepository extends JpaRepository<WaitlistEntity, Long> {

    // 候位管理頁：狀態在清單裡（WAITING、CALLED）的，照登記時間排，先來的在前面
    List<WaitlistEntity> findByStatusInOrderByCreatedAtAsc(List<String> statuses);

    // 同筆候位所有狀態轉移共用此列鎖。原生 SQL 避免 MySQL 5.7 不支援的 FOR UPDATE OF。
    @Query(value = "SELECT * FROM waitlist WHERE id = :id FOR UPDATE", nativeQuery = true)
    Optional<WaitlistEntity> findByIdForUpdate(@Param("id") Long id);

    // 先找候選 id，逐筆鎖住並在鎖內重新驗狀態與期限。
    @Query("SELECT w.id FROM WaitlistEntity w WHERE w.status = 'CALLED' AND w.calledAt <= :deadline ORDER BY w.id")
    List<Long> findOverdueIds(@Param("deadline") LocalDateTime deadline);

    List<WaitlistEntity> findByCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            LocalDateTime start, LocalDateTime end);

    long countByStatus(String status);

    @Query(value = "SELECT COUNT(*) FROM dining_session WHERE waitlist_id = :id", nativeQuery = true)
    long countSessionsByWaitlistId(@Param("id") Long id);

}






