package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tw.ispan.smartorder.entity.OptionValue;

@Repository
public interface OptionValueRepository extends JpaRepository<OptionValue, Long> {
}
