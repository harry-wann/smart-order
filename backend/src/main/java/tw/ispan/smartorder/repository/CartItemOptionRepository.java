package tw.ispan.smartorder.repository;

import tw.ispan.smartorder.entity.CartItemOption;
import tw.ispan.smartorder.entity.CartItemOptionId;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CartItemOptionRepository
        extends JpaRepository<CartItemOption, CartItemOptionId> {

    List<CartItemOption> findByCartItem_Id(Long cartItemId);

    void deleteByCartItem_Id(Long cartItemId);
}