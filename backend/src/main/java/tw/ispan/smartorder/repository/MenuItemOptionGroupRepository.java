package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.ispan.smartorder.dto.AdminAssociatedMenuItemDto;
import tw.ispan.smartorder.entity.MenuItemOptionGroupEntity;
import tw.ispan.smartorder.entity.embeddable.MenuOptionEntity;

import java.util.List;

public interface MenuItemOptionGroupRepository extends JpaRepository<MenuItemOptionGroupEntity, MenuOptionEntity> {
    List<MenuItemOptionGroupEntity> findById_MenuItemId(Long menuItemId);
    @Query("""
            SELECT new tw.ispan.smartorder.dto.AdminAssociatedMenuItemDto(
                menuItem.id,
                menuItem.name
            )
            FROM MenuItemOptionGroupEntity relation
            JOIN MenuItemEntity menuItem ON menuItem.id = relation.id.menuItemId
            WHERE relation.id.optionGroupId = :optionGroupId
            ORDER BY relation.sortOrder, menuItem.sortOrder, menuItem.id
            """)
    List<AdminAssociatedMenuItemDto> findAdminMenuItemsByOptionGroupId(
            @Param("optionGroupId") Long optionGroupId
    );
}
