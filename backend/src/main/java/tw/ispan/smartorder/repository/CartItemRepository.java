package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.CartItemEntity;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItemEntity, Long> {

    boolean existsByMenuItem_Id(Long menuItemId);

    // 同桌共用的購物車，保留加入順序。
    List<CartItemEntity> findByDiningSession_IdOrderByIdAsc(Long sessionId);

    // 只查詢目前客人的商品
    List<CartItemEntity> findByDiningSession_IdAndAddedByGuest_IdOrderByIdAsc(
            Long sessionId,
            Long guestId
    );

    // 修改、刪除時確認商品是誰點的
    Optional<CartItemEntity> findByIdAndDiningSession_IdAndAddedByGuest_Id(
            Long itemId,
            Long sessionId,
            Long guestId
    );
}
