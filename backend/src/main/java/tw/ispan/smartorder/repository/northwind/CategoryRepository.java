package tw.ispan.smartorder.repository.northwind;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.northwind.Category;

public interface CategoryRepository extends JpaRepository<Category, Integer> {
}
