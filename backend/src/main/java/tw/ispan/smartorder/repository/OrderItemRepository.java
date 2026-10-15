package tw.ispan.smartorder.repository;

import tw.ispan.smartorder.entity.OrderItemEntity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderItemRepository
        extends JpaRepository<OrderItemEntity, Long> {

    // 查詢訂單中的有效餐點
    List<OrderItemEntity>
    findByOrderTicketIdAndStatusNotOrderByIdAsc(
            Long orderTicketId, String status
    );

}