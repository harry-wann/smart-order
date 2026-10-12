package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tw.ispan.smartorder.entity.OptionGroupEntity;

@Repository
public interface OptionGroupRepository extends JpaRepository<OptionGroupEntity, Long> {
}
