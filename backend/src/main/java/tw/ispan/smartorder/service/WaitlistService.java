package tw.ispan.smartorder.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.dto.WaitlistResponse;
import tw.ispan.smartorder.repository.WaitlistRepository;

@Service
@Transactional(readOnly = true)
public class WaitlistService {

    @Autowired
    private WaitlistRepository waitlists;

    // 候位管理頁：還在等的（等待中、已叫號），先來的在前面
    public List<WaitlistResponse> findActive() {
        return waitlists.findByStatusInOrderByCreatedAtAsc(List.of("WAITING", "CALLED")).stream()
                .map(WaitlistResponse::from)
                .toList();
    }
}