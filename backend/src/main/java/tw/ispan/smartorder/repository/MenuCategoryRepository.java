package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tw.ispan.smartorder.dto.AdminMenuCategoryDto;
import tw.ispan.smartorder.entity.MenuCategoryEntity;

import java.util.List;
import java.util.Optional;

@Repository
public interface MenuCategoryRepository extends JpaRepository<MenuCategoryEntity,Long> {
    // 顧客端：只給啟用的分類，依排序值、同值再依 id
    List<MenuCategoryEntity> findByActiveTrueOrderBySortOrderAscIdAsc();

    // 後台：全部分類（含停用）與品項數量、出餐順序，順序跟顧客端一致
    @Query("""
    SELECT new tw.ispan.smartorder.dto.AdminMenuCategoryDto(
        category.id,
        category.name,
        COUNT(item.id),
        category.sortOrder,
        category.active,
        category.cookOrder
    )
    FROM MenuCategoryEntity category
    LEFT JOIN category.menuItems item
    GROUP BY category.id, category.name, category.sortOrder, category.active, category.cookOrder
    ORDER BY category.sortOrder, category.id
    """)
    List<AdminMenuCategoryDto> findAdminCategoriesWithItemCount();

    // 後台寫入分類前先鎖列（SELECT ... FOR UPDATE）：改名／停用、排序、刪除彼此排隊，鎖到交易結束。
    // 鎖完才讀到的是最新資料，整列寫回不會把別人剛改的名稱或停用狀態改回舊值。
    // 一次鎖多列一定照 id 由小到大，才不會兩個交易互相等對方
    // 用原生 SQL 的 FOR UPDATE（跟其他 repository 一樣）：@Lock 會產生 MySQL 8 才有的 FOR UPDATE OF，團隊的 MySQL 5.7 不支援
    @Query(nativeQuery = true, value = "SELECT * FROM menu_category WHERE id = :categoryId FOR UPDATE")
    Optional<MenuCategoryEntity> findByIdForUpdate(@Param("categoryId") Long categoryId);

    @Query(nativeQuery = true, value = "SELECT * FROM menu_category ORDER BY id FOR UPDATE")
    List<MenuCategoryEntity> findAllForUpdateOrderById();

    // 新分類排在最後面：取目前最大的排序值再加 1
    @Query("SELECT COALESCE(MAX(category.sortOrder), 0) FROM MenuCategoryEntity category")
    Integer findMaxSortOrder();

    // 分類名稱不重複（不分大小寫）；改名時要排除自己。
    // 這是先擋一般情況、給好懂的錯誤；同一瞬間的同名新增由唯一索引 uk_menu_category_name 擋（見 MenuCategoryService）
    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
