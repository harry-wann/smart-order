package tw.ispan.smartorder.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import tw.ispan.smartorder.entity.Waitlist;

public interface WaitlistRepository extends JpaRepository<Waitlist, Long> {

    // 候位管理頁：狀態在清單裡（WAITING、CALLED）的，照登記時間排，先來的在前面
    List<Waitlist> findByStatusInOrderByCreatedAtAsc(List<String> statuses);

    // 取號用：找出最後一筆登記的候位（id 最大的），拿它的號碼 +1
    Optional<Waitlist> findTopByOrderByIdDesc();
}

