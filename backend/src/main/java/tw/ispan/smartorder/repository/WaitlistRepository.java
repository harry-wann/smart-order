package tw.ispan.smartorder.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.Waitlist;

public interface WaitlistRepository extends JpaRepository<Waitlist, Long> {

    // 候位管理頁：狀態在清單裡（WAITING、CALLED）的，照登記時間排，先來的在前面
    List<Waitlist> findByStatusInOrderByCreatedAtAsc(List<String> statuses);
}