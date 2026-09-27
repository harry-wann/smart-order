package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.Category;

public interface CategoryRepository extends JpaRepository<Category, Integer> {
}
