package tw.ispan.northwind.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.northwind.entity.ProductEntity;

// 原路徑 tw.ispan.smartorder.repository

public interface ProductRepository extends JpaRepository<ProductEntity, Integer> {
}
