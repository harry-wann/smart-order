package tw.ispan.northwind.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.northwind.entity.Product;

// 原路徑 tw.ispan.smartorder.repository

public interface ProductRepository extends JpaRepository<Product, Integer> {
}
