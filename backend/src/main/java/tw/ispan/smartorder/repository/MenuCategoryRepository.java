package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import tw.ispan.smartorder.dto.AdminMenuCategoryDto;
import tw.ispan.smartorder.entity.MenuCategoryEntity;

import java.util.List;

@Repository
public interface MenuCategoryRepository extends JpaRepository<MenuCategoryEntity,Long> {
    // 顧客端：只給啟用的分類，依排序值、同值再依 id
    List<MenuCategoryEntity> findByActiveTrueOrderBySortOrderAscIdAsc();

    // 後台：全部分類（含停用）與品項數量，順序跟顧客端一致
    @Query("""
    SELECT new tw.ispan.smartorder.dto.AdminMenuCategoryDto(
        category.id,
        category.name,
        COUNT(item.id),
        category.sortOrder,
        category.active
    )
    FROM MenuCategoryEntity category
    LEFT JOIN category.menuItems item
    GROUP BY category.id, category.name, category.sortOrder, category.active
    ORDER BY category.sortOrder, category.id
    """)
    List<AdminMenuCategoryDto> findAdminCategoriesWithItemCount();

    List<MenuCategoryEntity> findAllByOrderBySortOrderAscIdAsc();

    // 新分類排在最後面：取目前最大的排序值再加 1
    @Query("SELECT COALESCE(MAX(category.sortOrder), 0) FROM MenuCategoryEntity category")
    Integer findMaxSortOrder();

    // 分類名稱不重複（不分大小寫）；改名時要排除自己
    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
