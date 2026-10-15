package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.DiningSessionGuestEntity;

public interface DiningSessionGuestRepository extends JpaRepository<DiningSessionGuestEntity,Long> {
	boolean existsByDiningSessionIdAndDeviceId(Long diningSessionId, String deviceId);
	long countByDiningSessionId(Long diningSessionId);

}
