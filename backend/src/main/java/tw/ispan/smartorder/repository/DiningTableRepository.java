package tw.ispan.smartorder.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import tw.ispan.smartorder.entity.DiningTable;

public interface DiningTableRepository extends JpaRepository<DiningTable, Long> {

    List<DiningTable> findByActiveTrueOrderByTableNoAsc();

    // 開桌用：查這張桌的同時把它鎖住（SELECT ... FOR UPDATE），同一時間只有一個人能開
    @Query(value = "SELECT * FROM dining_table WHERE id = :id FOR UPDATE", nativeQuery = true)
    Optional<DiningTable> findByIdForUpdate(Long id);
}