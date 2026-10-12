package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.DiningSessionGuest;

public interface DiningSessionGuestRepository extends JpaRepository<DiningSessionGuest,Long> {
	boolean existsByDiningSessionIdAndDeviceId(Long diningSessionId, String deviceId);
	long countByDiningSessionId(Long diningSessionId);

}
