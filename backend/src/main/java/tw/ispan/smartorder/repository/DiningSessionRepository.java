package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.DiningSession;

public interface DiningSessionRepository extends JpaRepository<DiningSession, Long> {
}