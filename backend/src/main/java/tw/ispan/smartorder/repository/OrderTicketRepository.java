package tw.ispan.smartorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.OrderTicketEntity;
import java.util.List;

public interface OrderTicketRepository extends JpaRepository<OrderTicketEntity, Long> {
    List<OrderTicketEntity> findByDiningSessionIdAndStatusNotOrderBySequenceNoDesc(Long sessionId, String status);

    // 呼叫端先鎖定 DiningSession，避免同桌同時送單產生相同序號。
    List<OrderTicketEntity> findByDiningSessionIdOrderBySequenceNoDesc(Long sessionId);
}
