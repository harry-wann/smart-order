package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.CartItem;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    // 只查詢目前客人的商品
    List<CartItem> findByDiningSession_IdAndAddedByGuest_IdOrderByIdAsc(
            Long sessionId,
            Long guestId
    );

    // 修改、刪除時確認商品是誰點的
    Optional<CartItem> findByIdAndDiningSession_IdAndAddedByGuest_Id(
            Long itemId,
            Long sessionId,
            Long guestId
    );
}