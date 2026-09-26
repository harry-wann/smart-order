package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.Product;

public interface ProductRepository extends JpaRepository<Product, Integer> {
}
