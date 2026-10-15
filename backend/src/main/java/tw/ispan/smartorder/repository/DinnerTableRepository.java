package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.DiningTableEntity;

import javax.swing.text.html.Option;
import java.util.Optional;

public interface DinnerTableRepository extends JpaRepository<DiningTableEntity,Long> {
	Optional<DiningTableEntity> findByTableNo(String tableNo);
}
