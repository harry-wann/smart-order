package tw.ispan.smartorder.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.ispan.smartorder.entity.DiningTable;
import java.util.Optional;

public interface DiningTableRepository extends JpaRepository<DiningTable, Long> {
    Optional<DiningTable> findByTableNo(String tableNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from DiningTable t where t.tableNo = :tableNumber")
    Optional<DiningTable> findWithLockByTableNo(@Param("tableNumber") String tableNumber);
}
