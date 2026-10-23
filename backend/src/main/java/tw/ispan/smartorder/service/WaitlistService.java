package tw.ispan.smartorder.service;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.dto.RegisterWaitlistRequest;
import tw.ispan.smartorder.dto.WaitlistResponse;
import tw.ispan.smartorder.entity.DiningSessionEntity;
import tw.ispan.smartorder.entity.WaitlistEntity;
import tw.ispan.smartorder.repository.WaitlistRepository;

@Service
@Transactional(readOnly = true)
public class WaitlistService {

    @Autowired
    private WaitlistRepository waitlists;

    @Autowired
    private TableService tableService;

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
        WaitlistEntity saved = waitlists.save(
                WaitlistEntity.register(ticketNo, request.contactName(), request.contactPhone(), request.partySize()));

        return WaitlistResponse.from(saved);
    }

    // 叫號：只有「等待中」可以叫號
    @Transactional
    public WaitlistResponse call(Long id) {
        WaitlistEntity w = findOrThrow(id);
        if (!"WAITING".equals(w.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "這組不是等待中，不能叫號");
        }
        w.call();
        return WaitlistResponse.from(w);
    }

    // 放棄：等待中、已叫號都可以放棄
    @Transactional
    public void abandon(Long id) {
        WaitlistEntity w = findOrThrow(id);
        if (!"WAITING".equals(w.getStatus()) && !"CALLED".equals(w.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "這組已經結束，不能放棄");
        }
        w.abandon();
    }

    // S-10b 報到開桌：用候位登記的人數開桌，候位改成已入座
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public WaitlistResponse seat(Long id, Long tableId) {
        WaitlistEntity waitlist = findOrThrow(id);
        if (!"WAITING".equals(waitlist.getStatus()) && !"CALLED".equals(waitlist.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "這組已經結束，不能報到");
        }

        // 鎖桌、檢查空桌、建用餐紀錄，都在 openSession 裡（跟現場開桌同一套）
        DiningSessionEntity session = tableService.openSession(
                tableId, waitlist.getAdultCount(), waitlist.getChildCount());

        // 兩邊互相記住對方：用餐紀錄知道是哪組候位來的，候位知道坐進哪筆用餐
        session.setWaitlistId(waitlist.getId());
        waitlist.seat(session.getId());

        return WaitlistResponse.from(waitlist);
    }

    // 叫號後幾分鐘沒報到就算過號（S-10 規格：10 分鐘）
    private static final int CALL_EXPIRE_MINUTES = 10;

    // 排程每分鐘呼叫：已叫號超過 10 分鐘的組別 → 過號；回傳這次標了幾組（記日誌用）
    @Transactional
    public int expireOverdue() {
        LocalDateTime deadline = LocalDateTime.now().minusMinutes(CALL_EXPIRE_MINUTES);
        List<WaitlistEntity> overdue = waitlists.findByStatusAndCalledAtBefore("CALLED", deadline);
        overdue.forEach(WaitlistEntity::expire);
        return overdue.size();
    }

    // 共用：用 id 找候位，找不到回 404
    private WaitlistEntity findOrThrow(Long id) {
        return waitlists.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到這組候位"));
    }

}
