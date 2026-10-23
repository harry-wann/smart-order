package tw.ispan.smartorder.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.ispan.smartorder.entity.WaitlistTicketCounterEntity;

public interface WaitlistTicketCounterRepository extends JpaRepository<WaitlistTicketCounterEntity, Integer> {
    @Query(value = "SELECT * FROM waitlist_ticket_counter WHERE id = :id FOR UPDATE", nativeQuery = true)
    Optional<WaitlistTicketCounterEntity> findByIdForUpdate(@Param("id") Integer id);
}
