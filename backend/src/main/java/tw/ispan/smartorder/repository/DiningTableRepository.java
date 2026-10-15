package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.ispan.smartorder.entity.DiningTableEntity;

import java.util.List;
import java.util.Optional;

// dining_table 只留這一支 Repository；
// 原本的 DinnerTableRepository、ReservationTableRepository 已合併進來
// 上鎖的查詢都用原生 SQL：Hibernate 7 的 @Lock 會產生 MySQL 5.7 不支援的 FOR UPDATE OF
public interface DiningTableRepository extends JpaRepository<DiningTableEntity, Long> {

    Optional<DiningTableEntity> findByTableNo(String tableNo);

    List<DiningTableEntity> findByActiveTrueOrderByTableNoAsc();

    // 結帳要先鎖桌位
    @Query(nativeQuery = true, value = "SELECT * FROM dining_table WHERE table_no = :tableNo FOR UPDATE")
    Optional<DiningTableEntity> findWithLockByTableNo(@Param("tableNo") String tableNo);

    // 開桌要先鎖桌位，兩個櫃檯同時開同一張只會成功一個；鎖住之後 service 才檢查 status 是不是 AVAILABLE。
    // active = 1 也一起帶，停用的桌查不到，會被當成找不到這張桌
    @Query(nativeQuery = true, value = "SELECT * FROM dining_table WHERE id = :id AND active = 1 FOR UPDATE")
    Optional<DiningTableEntity> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT t FROM DiningTableEntity t
            WHERE t.active = true AND t.reservable = true AND t.seats >= :partySize
            ORDER BY t.seats, t.tableNo
            """)
    List<DiningTableEntity> findReservable(@Param("partySize") int partySize);

    // 建立訂位時把坐得下的線上可訂桌整組鎖住（M7 問題 3），最後挑哪張由 service 在鎖裡算。
    // 依 id 排序上鎖，兩筆訂位同時進來時鎖的順序一致，不會互相卡死
    @Query(nativeQuery = true, value = """
            SELECT * FROM dining_table
            WHERE active = 1 AND reservable = 1 AND seats >= :partySize
            ORDER BY id
            FOR UPDATE
            """)
    List<DiningTableEntity> findReservableForUpdate(@Param("partySize") int partySize);

    // 報到選桌用的空桌：營業中、狀態 AVAILABLE、坐得下。不看 reservable，現場的桌也能給報到的客人坐。
    // DiningTableEntity.status 是 String，所以 JPQL 可以直接寫 'AVAILABLE'
    @Query("""
            SELECT t FROM DiningTableEntity t
            WHERE t.active = true AND t.status = 'AVAILABLE' AND t.seats >= :partySize
            ORDER BY t.seats, t.tableNo
            """)
    List<DiningTableEntity> findAvailable(@Param("partySize") int partySize);
}
