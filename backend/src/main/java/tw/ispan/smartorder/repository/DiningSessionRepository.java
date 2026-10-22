package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.ispan.smartorder.entity.DiningSessionEntity;

import java.util.List;
import java.util.Optional;

// dining_session 只留這一支 Repository；
// 原本的 DingingSessionRepository、ReservationDiningSessionRepository 已合併進來
// 上鎖的查詢都用原生 SQL：Hibernate 7 的 @Lock 會產生 MySQL 5.7 不支援的 FOR UPDATE OF
public interface DiningSessionRepository extends JpaRepository<DiningSessionEntity, Long> {

    // 這張桌目前的用餐紀錄；資料庫沒擋同桌多筆 OPEN，取最新開的那筆
    Optional<DiningSessionEntity> findFirstByTableIdAndStatusOrderByOpenedAtDesc(Long tableId, String status);

    // 結帳時鎖定這張桌的用餐紀錄，呼叫端要檢查筆數
    @Query(
            value = """
                    SELECT *
                    FROM dining_session
                    WHERE table_id = :tableId AND status = :status
                    ORDER BY id
                    FOR UPDATE
                    """,
            nativeQuery = true
    )
    List<DiningSessionEntity> findWithLockByTableIdAndStatus(
            @Param("tableId") Long tableId,
            @Param("status") String status
    );

    // 購物車修改數量、刪除商品、送單時鎖定用餐紀錄
    @Query(
            value = """
                    SELECT *
                    FROM dining_session
                    WHERE id = :id
                    FOR UPDATE
                    """,
            nativeQuery = true
    )
    Optional<DiningSessionEntity> findWithLockById(@Param("id") Long id);

    // Caller already holds this table row lock; a plain READ_COMMITTED query avoids
    // locking another session and reversing the session -> table lock order.
    @Query(value = """
            SELECT id FROM dining_session
            WHERE table_id = :tableId AND status = 'OPEN'
            ORDER BY id
            """, nativeQuery = true)
    List<Long> findOpenSessionIdsByTableId(@Param("tableId") Long tableId);

    // S-02 桌況總覽：找出所有用餐中的紀錄，對應每桌的人數與開桌時間
    List<DiningSessionEntity> findByStatus(String status);
}
