package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.ispan.smartorder.dto.AdminMenuItemDto;
import tw.ispan.smartorder.dto.MenuItemOptionDetailRow;
import tw.ispan.smartorder.entity.MenuItemEntity;

import java.util.List;

public interface MenuItemRepository extends JpaRepository<MenuItemEntity,Long> {
    List<MenuItemEntity> findByCategory_Id(Long categoryId);
    @Query("""
    SELECT new tw.ispan.smartorder.dto.AdminMenuItemDto(mi.imageUrl, mi.name, mi.price)
    FROM MenuItemEntity mi
    WHERE mi.category.id = :categoryId
    ORDER BY mi.sortOrder
    """)
    List<AdminMenuItemDto> findAdminMenuItemsByCategoryId(@Param("categoryId") Long categoryId);

    @Query("""
    SELECT new tw.ispan.smartorder.dto.AdminMenuItemDto(mi.imageUrl, mi.name, mi.price)
    FROM MenuItemEntity mi
    ORDER BY mi.sortOrder
    """)
    List<AdminMenuItemDto> findAllAdminMenuItems();

    List<MenuItemEntity> findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
            String name, String description
    );

    @Query("""
    SELECT mi.id AS menuItemId,
           mi.name AS menuItemName,
           mi.description AS description,
           mi.price AS price,
           mi.imageUrl AS imageUrl,
           og.id AS optionGroupId,
           og.name AS optionGroupName,
           og.minSelect AS minSelect,
           og.maxSelect AS maxSelect,
           ov.id AS optionValueId,
           ov.name AS optionValueName,
           ov.priceDelta AS priceDelta
    FROM MenuItemEntity mi
    LEFT JOIN MenuItemOptionGroupEntity mog ON mi.id = mog.id.menuItemId
    LEFT JOIN OptionGroupEntity og ON mog.id.optionGroupId = og.id
    LEFT JOIN OptionValueEntity ov ON og.id = ov.optionGroupId.id
    WHERE mi.id = :menuItemId
    ORDER BY mog.sortOrder, og.sortOrder, ov.sortOrder
    """)
    List<MenuItemOptionDetailRow> findOptionValuesByMenuItemId(@Param("menuItemId") Long menuItemId);
}
