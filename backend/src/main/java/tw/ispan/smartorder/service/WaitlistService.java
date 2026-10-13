package tw.ispan.smartorder.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.dto.RegisterWaitlistRequest;
import tw.ispan.smartorder.dto.WaitlistResponse;
import tw.ispan.smartorder.entity.Waitlist;
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

    // 現場登記：算出下一號，新增一筆候位
    @Transactional
    public WaitlistResponse register(RegisterWaitlistRequest request) {
        // 1. 最後一號是幾號？例如 "A14" → 14；完全沒有人登記過就當作 0
        int lastNo = waitlists.findTopByOrderByIdDesc()
                .map(w -> Integer.parseInt(w.getTicketNo().substring(1)))
                .orElse(0);

        // 2. 下一號：14 + 1 = 15 → "A15"
        String ticketNo = String.format("A%02d", lastNo + 1);

        // 3. 新增一筆候位
        Waitlist saved = waitlists.save(
                Waitlist.register(ticketNo, request.contactName(), request.contactPhone(), request.partySize()));

        return WaitlistResponse.from(saved);
    }

}