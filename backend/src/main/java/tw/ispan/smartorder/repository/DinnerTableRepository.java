package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.DiningTable;

import javax.swing.text.html.Option;
import java.util.Optional;

public interface DinnerTableRepository extends JpaRepository<DiningTable,Long> {
	Optional<DiningTable> findByTableNo(String tableNo);
}
