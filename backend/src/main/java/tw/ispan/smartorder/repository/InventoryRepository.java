package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tw.ispan.smartorder.entity.InventoryEntity;

import java.util.Optional;

public interface InventoryRepository extends JpaRepository<InventoryEntity, Long> {
    Optional<InventoryEntity> findByMenuItem_Id(Long menuItemId);

    void deleteByMenuItem_Id(Long menuItemId);

    @Modifying(flushAutomatically = true)
    @Query(value = "UPDATE inventory_item SET quantity = quantity - :quantity WHERE menu_item_id = :menuItemId AND quantity >= :quantity", nativeQuery = true)
    int decreaseIfEnough(@Param("menuItemId") Long menuItemId, @Param("quantity") int quantity);

    @Modifying(flushAutomatically = true)
    @Query(value = "UPDATE inventory_item SET quantity = quantity + :quantity WHERE menu_item_id = :menuItemId", nativeQuery = true)
    int increase(@Param("menuItemId") Long menuItemId, @Param("quantity") int quantity);

    @Query(value = "SELECT quantity FROM inventory_item WHERE menu_item_id = :menuItemId", nativeQuery = true)
    Integer currentQuantity(@Param("menuItemId") Long menuItemId);
}
