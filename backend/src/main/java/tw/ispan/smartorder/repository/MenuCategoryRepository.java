package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tw.ispan.smartorder.entity.MenuCategoryEntity;

@Repository
public interface MenuCategoryRepository extends JpaRepository<MenuCategoryEntity,Long> {
}
