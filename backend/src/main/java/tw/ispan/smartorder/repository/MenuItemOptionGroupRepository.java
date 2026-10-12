package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.MenuItemOptionGroupEntity;
import tw.ispan.smartorder.entity.embeddable.MenuOptionEntity;

public interface MenuItemOptionGroupRepository extends JpaRepository<MenuItemOptionGroupEntity, MenuOptionEntity> {
}
