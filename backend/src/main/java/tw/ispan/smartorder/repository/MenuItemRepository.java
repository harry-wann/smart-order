package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.ispan.smartorder.dto.MenuItemOptionDetailDto;
import tw.ispan.smartorder.entity.MenuItemEntity;

import java.util.List;

public interface MenuItemRepository extends JpaRepository<MenuItemEntity,Long> {
    List<MenuItemEntity> findByCategory_Id(Long categoryId);
    List<MenuItemEntity> findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
            String name, String description
    );

    @Query("""
    SELECT new tw.ispan.smartorder.dto.MenuItemOptionDetailDto(mi, og, ov)
    FROM MenuItemEntity mi
    JOIN MenuItemOptionGroupEntity mog ON mi.id = mog.id.menuItemId
    JOIN OptionGroupEntity og ON mog.id.optionGroupId = og.id
    JOIN OptionValueEntity ov ON og.id = ov.optionGroupId.id
    WHERE mi.id = :menuItemId
    """)
    List<MenuItemOptionDetailDto> findOptionValuesByMenuItemId(@Param("menuItemId") Long menuItemId);
}
