package tw.ispan.smartorder.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.ispan.smartorder.entity.DiningTableEntity;

import java.util.List;
import java.util.Optional;

public interface DiningTableRepository extends JpaRepository<DiningTableEntity, Long> {
    Optional<DiningTableEntity> findByTableNo(String tableNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from DiningTableEntity t where t.tableNo = :tableNumber")
    Optional<DiningTableEntity> findWithLockByTableNo(@Param("tableNumber") String tableNumber);

    List<DiningTableEntity> findByActiveTrueOrderByTableNoAsc();
}