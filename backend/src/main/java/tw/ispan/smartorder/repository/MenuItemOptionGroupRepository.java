package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.dto.AdminAssociatedMenuItemDto;
import tw.ispan.smartorder.entity.MenuItemOptionGroupEntity;
import tw.ispan.smartorder.entity.embeddable.MenuOptionEntity;

import java.util.Collection;
import java.util.List;

public interface MenuItemOptionGroupRepository extends JpaRepository<MenuItemOptionGroupEntity, MenuOptionEntity> {
    List<MenuItemOptionGroupEntity> findById_MenuItemId(Long menuItemId);

    // 一次抓多個品項的關聯，依品項、再依該品項上的顯示順序排；後台清單用，避免每個品項各查一次
    @Query("""
            SELECT relation
            FROM MenuItemOptionGroupEntity relation
            WHERE relation.id.menuItemId IN :menuItemIds
            ORDER BY relation.id.menuItemId, relation.sortOrder, relation.id.optionGroupId
            """)
    List<MenuItemOptionGroupEntity> findByMenuItemIds(@Param("menuItemIds") Collection<Long> menuItemIds);

    @Modifying
    @Transactional
    @Query("DELETE FROM MenuItemOptionGroupEntity relation WHERE relation.id.menuItemId = :menuItemId")
    void deleteByMenuItemId(@Param("menuItemId") Long menuItemId);
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
