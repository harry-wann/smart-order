package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.VerificationCodeEntity;

import java.util.Optional;

public interface VerificationCodeRepository extends JpaRepository<VerificationCodeEntity, Long> {
	Optional<VerificationCodeEntity> findFirstByPhoneOrderByIdDesc(String phone);

}