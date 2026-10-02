package tw.ispan.smartorder.repository.northwind;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.northwind.Product;

public interface ProductRepository extends JpaRepository<Product, Integer> {
}
