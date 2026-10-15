package tw.ispan.smartorder.staff.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tw.ispan.smartorder.entity.StaffEntity;

import java.util.Optional;

// 原檔名 StaffRepository.kt

@Repository
public interface StaffRepository extends JpaRepository<StaffEntity, Long> {

    // 停用的帳號直接查不到，登入時就跟帳號不存在是同一條路，回一樣的錯誤訊息
    Optional<StaffEntity> findByUsernameAndActiveTrue(String username);
}
