package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.dto.AdminAssociatedMenuItemDto;
import tw.ispan.smartorder.dto.OptionGroupMenuItemCountRow;
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

    // 挑出「掛了必選群組（min_select > 0）」的品項 id；顧客端菜單列表用它判斷 [+] 能不能直接加入購物車，
    // 一次查完，不要每個品項各查一次
    @Query("""
            SELECT DISTINCT relation.id.menuItemId
            FROM MenuItemOptionGroupEntity relation
            JOIN OptionGroupEntity optionGroup ON optionGroup.id = relation.id.optionGroupId
            WHERE relation.id.menuItemId IN :menuItemIds
              AND optionGroup.minSelect > 0
            """)
    List<Long> findMenuItemIdsWithRequiredOptions(@Param("menuItemIds") Collection<Long> menuItemIds);

    // 每個群組掛在幾個品項，GROUP BY 一次查回來；後台群組清單（S-06）用。
    // 算法跟 findAdminMenuItemsByOptionGroupId 一樣（含下架的品項），左邊的數字才會跟右邊「共 N 個品項」對得上
    @Query("""
            SELECT relation.id.optionGroupId AS optionGroupId,
                   COUNT(menuItem.id) AS menuItemCount
            FROM MenuItemOptionGroupEntity relation
            JOIN MenuItemEntity menuItem ON menuItem.id = relation.id.menuItemId
            GROUP BY relation.id.optionGroupId
            """)
    List<OptionGroupMenuItemCountRow> countMenuItemsByOptionGroup();

    @Query("""
            SELECT COUNT(menuItem.id)
            FROM MenuItemOptionGroupEntity relation
            JOIN MenuItemEntity menuItem ON menuItem.id = relation.id.menuItemId
            WHERE relation.id.optionGroupId = :optionGroupId
            """)
    long countMenuItemsByOptionGroupId(@Param("optionGroupId") Long optionGroupId);

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
