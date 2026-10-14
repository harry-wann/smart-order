
package tw.ispan.smartorder.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.ispan.smartorder.entity.DiningSession;

import java.util.List;
import java.util.Optional;

public interface DiningSessionRepository
        extends JpaRepository<DiningSession, Long> {

    // 查詢最新用餐紀錄
    Optional<DiningSession>
    findFirstByTableIdAndStatusOrderByOpenedAtDesc(
            Long tableId,
            String status
    );

    // 結帳時鎖定用餐紀錄（保留原本功能）
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<DiningSession> findByTableIdAndStatus(
            Long tableId,
            String status
    );

    // 購物車修改數量、刪除商品時鎖定用餐紀錄，使用 MySQL 5.7 支援的 FOR UPDATE
    @Query(
            value = """
                    SELECT *
                    FROM dining_session
                    WHERE id = :id
                    FOR UPDATE
                    """,
            nativeQuery = true
    )
    Optional<DiningSession> findWithLockById(
            @Param("id") Long id
    );
}
