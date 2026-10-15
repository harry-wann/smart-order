package tw.ispan.northwind.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.northwind.entity.CategoryEntity;

// 原路徑 tw.ispan.smartorder.repository

public interface CategoryRepository extends JpaRepository<CategoryEntity, Integer> {
}
