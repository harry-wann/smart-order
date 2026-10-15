package tw.ispan.smartorder.repository;

import tw.ispan.smartorder.entity.CartItemOptionEntity;
import tw.ispan.smartorder.entity.CartItemOptionIdEntity;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CartItemOptionRepository
        extends JpaRepository<CartItemOptionEntity, CartItemOptionIdEntity> {

    List<CartItemOptionEntity> findByCartItem_Id(Long cartItemId);

    void deleteByCartItem_Id(Long cartItemId);
}