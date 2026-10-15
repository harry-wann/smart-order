package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.DiningSessionEntity;

import java.util.Optional;

public interface DingingSessionRepository extends JpaRepository<DiningSessionEntity,Long> {
	Optional<DiningSessionEntity> findByTableIdAndStatus(Long tableId, String status);
}
