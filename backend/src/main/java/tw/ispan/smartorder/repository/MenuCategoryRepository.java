package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import tw.ispan.smartorder.dto.AdminMenuCategoryDto;
import tw.ispan.smartorder.entity.MenuCategoryEntity;

import java.util.List;

@Repository
public interface MenuCategoryRepository extends JpaRepository<MenuCategoryEntity,Long> {
    @Query("""
    SELECT new tw.ispan.smartorder.dto.AdminMenuCategoryDto(
        category.id,
        category.name,
        COUNT(item.id)
    )
    FROM MenuCategoryEntity category
    LEFT JOIN category.menuItems item
    GROUP BY category.id, category.name
    ORDER BY category.id
    """)
    List<AdminMenuCategoryDto> findAdminCategoriesWithItemCount();
}
