package tw.ispan.smartorder.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.DiningSession;

public interface DiningSessionRepository extends JpaRepository<DiningSession, Long> {
    List<DiningSession> findByStatus(String status);
}