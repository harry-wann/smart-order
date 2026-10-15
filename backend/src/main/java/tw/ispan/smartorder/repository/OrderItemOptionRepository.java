package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.OrderItemOptionEntity;

import java.util.List;

public interface OrderItemOptionRepository
        extends JpaRepository<OrderItemOptionEntity, Long> {

    // 查詢一個餐點的選項
    List<OrderItemOptionEntity> findByOrderItemIdOrderByIdAsc(
            Long orderItemId
    );

    // 查詢多個餐點的選項
    List<OrderItemOptionEntity> findByOrderItemIdInOrderByIdAsc(
            List<Long> orderItemIds
    );
}
