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
    List<MenuItemEntity> findByActiveTrue();
    List<MenuItemEntity> findByActiveTrueAndCategory_Id(Long categoryId);

    @Query("""
    SELECT mi
    FROM MenuItemEntity mi
    WHERE mi.active = true
      AND (LOWER(mi.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        OR LOWER(mi.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
    """)
    List<MenuItemEntity> searchActiveMenuItemsByKeyword(@Param("keyword") String keyword);
    @Query("""
    SELECT new tw.ispan.smartorder.dto.AdminMenuItemDto(
        mi.id, mi.imageUrl, mi.name, mi.description, mi.price, mi.category.id,
        COALESCE(inventory.quantity, 0), mi.active
    )
    FROM MenuItemEntity mi
    LEFT JOIN mi.inventory inventory
    WHERE mi.category.id = :categoryId
    ORDER BY mi.sortOrder
    """)
    List<AdminMenuItemDto> findAdminMenuItemsByCategoryId(@Param("categoryId") Long categoryId);

    @Query("""
    SELECT new tw.ispan.smartorder.dto.AdminMenuItemDto(
        mi.id, mi.imageUrl, mi.name, mi.description, mi.price, mi.category.id,
        COALESCE(inventory.quantity, 0), mi.active
    )
    FROM MenuItemEntity mi
    LEFT JOIN mi.inventory inventory
    ORDER BY mi.sortOrder
    """)
    List<AdminMenuItemDto> findAllAdminMenuItems();

    @Query("""
    SELECT new tw.ispan.smartorder.dto.AdminMenuItemDto(
        mi.id, mi.imageUrl, mi.name, mi.description, mi.price, mi.category.id,
        COALESCE(inventory.quantity, 0), mi.active
    )
    FROM MenuItemEntity mi
    LEFT JOIN mi.inventory inventory
    WHERE LOWER(mi.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
       OR LOWER(mi.description) LIKE LOWER(CONCAT('%', :keyword, '%'))
    ORDER BY mi.sortOrder
    """)
    List<AdminMenuItemDto> searchAdminMenuItemsByKeyword(@Param("keyword") String keyword);

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
    LEFT JOIN OptionValueEntity ov ON og.id = ov.optionGroupId.id AND ov.active = true
    LEFT JOIN mi.inventory inventory
    WHERE mi.id = :menuItemId
      AND mi.active = true
      AND COALESCE(inventory.quantity, 0) > 0
    ORDER BY mog.sortOrder, og.sortOrder, ov.sortOrder
    """)
    List<MenuItemOptionDetailRow> findOptionValuesByMenuItemId(@Param("menuItemId") Long menuItemId);
}
