package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.MemberEntity;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<MemberEntity, Long> {
	Optional<MemberEntity> findByPhone(String phone);
}
