package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.OrderItemOption;

import java.util.List;

public interface OrderItemOptionRepository
        extends JpaRepository<OrderItemOption, Long> {

    // 查詢一個餐點的選項
    List<OrderItemOption> findByOrderItemIdOrderByIdAsc(
            Long orderItemId
    );

    // 查詢多個餐點的選項
    List<OrderItemOption> findByOrderItemIdInOrderByIdAsc(
            List<Long> orderItemIds
    );
}
