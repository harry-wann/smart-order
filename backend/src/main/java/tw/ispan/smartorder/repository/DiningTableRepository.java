package tw.ispan.smartorder.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.DiningTable;

public interface DiningTableRepository extends JpaRepository<DiningTable, Long> {

    List<DiningTable> findByActiveTrueOrderByTableNoAsc();
}