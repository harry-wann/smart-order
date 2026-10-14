package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.DiningSession;

import java.util.Optional;

public interface DingingSessionRepository extends JpaRepository<DiningSession,Long> {
	Optional<DiningSession> findByTableIdAndStatus(Long tableId, String status);
}
