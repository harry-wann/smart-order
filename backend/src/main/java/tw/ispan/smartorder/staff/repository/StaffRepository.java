package tw.ispan.smartorder.staff.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tw.ispan.smartorder.entity.StaffEntity;

import java.util.Optional;

// 原檔名 StaffRepository.kt

@Repository
public interface StaffRepository extends JpaRepository<StaffEntity, Long> {

    Optional<StaffEntity> findByUsernameAndActiveTrue(String username);
}
