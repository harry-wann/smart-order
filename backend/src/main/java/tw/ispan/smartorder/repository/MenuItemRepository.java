package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.ispan.smartorder.dto.MenuItemOptionDetailRow;
import tw.ispan.smartorder.entity.MenuItemEntity;

import java.util.List;

public interface MenuItemRepository extends JpaRepository<MenuItemEntity,Long> {
    @Modifying
    @Query(value = "UPDATE menu_item SET sold_out = :soldOut WHERE id = :menuItemId", nativeQuery = true)
    int updateSoldOut(@Param("menuItemId") Long menuItemId, @Param("soldOut") boolean soldOut);
    List<MenuItemEntity> findByCategory_Id(Long categoryId);
    boolean existsByCategory_Id(Long categoryId);
    long countByCategory_Id(Long categoryId);

    // 顧客端看得到的品項：品項上架、所屬分類也啟用。
    // 全部分類時照分類排序值，同分類內照品項排序值，排序值相同再依 id，順序才固定
    @Query("""
    SELECT mi
    FROM MenuItemEntity mi
    JOIN mi.category category
    WHERE mi.active = true
      AND category.active = true
    ORDER BY category.sortOrder, category.id, mi.sortOrder, mi.id
    """)
    List<MenuItemEntity> findVisibleMenuItems();

    @Query("""
    SELECT mi
    FROM MenuItemEntity mi
    JOIN mi.category category
    WHERE mi.active = true
      AND category.active = true
      AND category.id = :categoryId
    ORDER BY mi.sortOrder, mi.id
    """)
    List<MenuItemEntity> findVisibleMenuItemsByCategoryId(@Param("categoryId") Long categoryId);

    @Query("""
    SELECT mi
    FROM MenuItemEntity mi
    JOIN mi.category category
    WHERE mi.active = true
      AND category.active = true
      AND (LOWER(mi.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        OR LOWER(mi.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
    ORDER BY category.sortOrder, category.id, mi.sortOrder, mi.id
    """)
    List<MenuItemEntity> searchActiveMenuItemsByKeyword(@Param("keyword") String keyword);

    // 後台看全部品項（含下架、分類停用的）；庫存一起抓回來，service 轉 DTO 時不用每個品項再查一次
    @Query("""
    SELECT mi
    FROM MenuItemEntity mi
    JOIN mi.category category
    LEFT JOIN FETCH mi.inventory
    WHERE category.id = :categoryId
    ORDER BY mi.sortOrder, mi.id
    """)
    List<MenuItemEntity> findAdminMenuItemsByCategoryId(@Param("categoryId") Long categoryId);

    @Query("""
    SELECT mi
    FROM MenuItemEntity mi
    JOIN mi.category category
    LEFT JOIN FETCH mi.inventory
    ORDER BY category.sortOrder, category.id, mi.sortOrder, mi.id
    """)
    List<MenuItemEntity> findAllAdminMenuItems();

    @Query("""
    SELECT mi
    FROM MenuItemEntity mi
    JOIN mi.category category
    LEFT JOIN FETCH mi.inventory
    WHERE LOWER(mi.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
       OR LOWER(mi.description) LIKE LOWER(CONCAT('%', :keyword, '%'))
    ORDER BY category.sortOrder, category.id, mi.sortOrder, mi.id
    """)
    List<MenuItemEntity> searchAdminMenuItemsByKeyword(@Param("keyword") String keyword);

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
    JOIN mi.category category
    LEFT JOIN MenuItemOptionGroupEntity mog ON mi.id = mog.id.menuItemId
    LEFT JOIN OptionGroupEntity og ON mog.id.optionGroupId = og.id
    LEFT JOIN OptionValueEntity ov ON og.id = ov.optionGroupId.id AND ov.active = true
    LEFT JOIN mi.inventory inventory
    WHERE mi.id = :menuItemId
      AND mi.active = true
      AND category.active = true
      AND (mi.trackInventory = false OR COALESCE(inventory.quantity, 0) > 0)
    ORDER BY mog.sortOrder, og.sortOrder, og.id, ov.sortOrder, ov.id
    """)
    List<MenuItemOptionDetailRow> findOptionValuesByMenuItemId(@Param("menuItemId") Long menuItemId);
}
