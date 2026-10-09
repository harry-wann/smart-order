package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.MenuItemEntity;

import java.util.List;

public interface MenuItemRepository extends JpaRepository<MenuItemEntity,Long> {
    List<MenuItemEntity> findByCategory_Id(Long categoryId);
    List<MenuItemEntity> findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
            String name, String description
    );
}
