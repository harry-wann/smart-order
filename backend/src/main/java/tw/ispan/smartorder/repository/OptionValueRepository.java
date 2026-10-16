package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.ispan.smartorder.dto.AdminOptionValueDto;
import tw.ispan.smartorder.entity.OptionValueEntity;

import java.util.List;

@Repository
public interface OptionValueRepository extends JpaRepository<OptionValueEntity, Long> {
    @Query("""
            SELECT COALESCE(MAX(optionValue.sortOrder), 0)
            FROM OptionValueEntity optionValue
            WHERE optionValue.optionGroupId.id = :optionGroupId
            """)
    Integer findMaxSortOrderByGroupId(@Param("optionGroupId") Long optionGroupId);

    @Query("""
            SELECT new tw.ispan.smartorder.dto.AdminOptionValueDto(
                optionValue.id,
                optionValue.name,
                optionValue.priceDelta,
                optionValue.sortOrder,
                optionValue.active
            )
            FROM OptionValueEntity optionValue
            WHERE optionValue.optionGroupId.id = :optionGroupId
            ORDER BY optionValue.sortOrder, optionValue.id
            """)
    List<AdminOptionValueDto> findAdminOptionValuesByGroupId(@Param("optionGroupId") Long optionGroupId);
}
