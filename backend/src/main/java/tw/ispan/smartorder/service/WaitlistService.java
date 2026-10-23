package tw.ispan.smartorder.service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.dto.RegisterWaitlistRequest;
import tw.ispan.smartorder.dto.WaitlistResponse;
import tw.ispan.smartorder.dto.WaitlistTodaySummary;
import tw.ispan.smartorder.entity.DiningSessionEntity;
import tw.ispan.smartorder.entity.WaitlistEntity;
import tw.ispan.smartorder.entity.WaitlistTicketCounterEntity;
import tw.ispan.smartorder.repository.WaitlistRepository;
import tw.ispan.smartorder.repository.WaitlistTicketCounterRepository;

@Service
@Transactional(readOnly = true)
public class WaitlistService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Taipei");
    private static final int CALL_EXPIRE_MINUTES = 10;
    // ticket_no is VARCHAR(10): A followed by at most nine digits.
    private static final long MAX_TICKET_NUMBER = 999_999_999L;

    @Autowired private WaitlistRepository waitlists;
    @Autowired private WaitlistTicketCounterRepository ticketCounters;
    @Autowired private TableService tableService;
    @Autowired private WaitlistNotifier notifier;

    // Overview and the existing S-10 list intentionally show only actionable rows.
    public List<WaitlistResponse> findActive() {
        return waitlists.findByStatusInOrderByCreatedAtAsc(List.of("WAITING", "CALLED")).stream()
                .map(WaitlistResponse::from)
                .toList();
    }

    // Today's date is based on registration time in the restaurant's timezone.
    // The average includes only today's SEATED rows with a persisted seated_at.
    public WaitlistTodaySummary todaySummary() {
        LocalDate date = LocalDate.now(ZONE);
        LocalDateTime start = date.atStartOfDay();
        List<WaitlistEntity> rows = waitlists.findByCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                start, date.plusDays(1).atStartOfDay());
        long waiting = 0, called = 0, seated = 0, expired = 0, abandoned = 0;
        long waitMillis = 0, samples = 0;
        for (WaitlistEntity row : rows) {
            switch (row.getStatus()) {
                case "WAITING" -> waiting++;
                case "CALLED" -> called++;
                case "SEATED" -> {
                    seated++;
                    if (row.getCreatedAt() != null && row.getSeatedAt() != null) {
                        waitMillis += Math.max(0, Duration.between(row.getCreatedAt(), row.getSeatedAt()).toMillis());
                        samples++;
                    }
                }
                case "EXPIRED" -> expired++;
                case "ABANDONED" -> abandoned++;
                default -> { }
            }
        }
        return new WaitlistTodaySummary(date, ZONE.getId(), waiting, called, seated, expired,
                abandoned, samples == 0 ? 0 : (double) waitMillis / samples / 60_000);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public WaitlistResponse register(RegisterWaitlistRequest request) {
        if (request == null || request.contactName() == null || request.contactName().isBlank()
                || request.contactName().strip().length() > 50) {
            throw ApiException.badRequest("候位姓名必填，且不可超過 50 字");
        }
        if (request.contactPhone() == null || !request.contactPhone().matches("[0-9]{4}")) {
            throw ApiException.badRequest("電話請填末四碼數字");
        }
        if (request.partySize() == null || request.partySize() < 1 || request.partySize() > 20) {
            throw ApiException.badRequest("候位人數須為 1 至 20 位");
        }

        // Lock the persisted counter. Existing ticket numbers are retained; the migration
        // initializes next_no after the highest historical A number.
        WaitlistTicketCounterEntity counter = ticketCounters.findByIdForUpdate(1)
                .orElseThrow(() -> new IllegalStateException("候位號碼序列尚未建立，請套用資料庫 migration"));
        long number = counter.getNextNo();
        if (number < 1 || number > MAX_TICKET_NUMBER) {
            throw ApiException.conflict("WAITLIST_TICKET_EXHAUSTED", "候位號碼已用完");
        }
        counter.setNextNo(number + 1);
        String ticketNo = String.format(Locale.ROOT, "A%02d", number);
        WaitlistEntity saved = waitlists.save(WaitlistEntity.register(ticketNo,
                request.contactName().strip(), request.contactPhone(), request.partySize(), now()));
        notifier.notifyUpdatedAfterCommit();
        return WaitlistResponse.from(saved);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public WaitlistResponse call(Long id) {
        WaitlistEntity waitlist = locked(id);
        LocalDateTime now = now();
        if ("WAITING".equals(waitlist.getStatus())) {
            waitlist.call(now);
        } else if ("CALLED".equals(waitlist.getStatus())) {
            ensureWithinCallWindow(waitlist, now);
            // Replaying the announcement must not move called_at or extend the deadline.
        } else {
            throw ApiException.conflict("WAITLIST_STATUS", "這組候位不能叫號");
        }
        notifier.notifyCalledAfterCommit(waitlist.getTicketNo(), waitlist.getPartySize());
        notifier.notifyUpdatedAfterCommit();
        return WaitlistResponse.from(waitlist);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void abandon(Long id) {
        WaitlistEntity waitlist = locked(id);
        if (!"WAITING".equals(waitlist.getStatus()) && !"CALLED".equals(waitlist.getStatus())) {
            throw ApiException.conflict("WAITLIST_STATUS", "這組候位已經結束，不能放棄");
        }
        waitlist.abandon();
        notifier.notifyUpdatedAfterCommit();
    }

    // Keep the lock order waitlist -> table. The waitlist lock covers both session creation
    // and status update, so two desks cannot seat the same ticket at different tables.
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public WaitlistResponse seat(Long id, Long tableId) {
        if (tableId == null) {
            throw ApiException.badRequest("請選擇桌位");
        }
        WaitlistEntity waitlist = locked(id);
        if (!"CALLED".equals(waitlist.getStatus())) {
            // 另一台櫃檯可能剛處理完這組，訊息直接說明現在的狀態
            String message = switch (waitlist.getStatus()) {
                case "WAITING" -> "這組候位還沒叫號，請先叫號";
                case "SEATED" -> "這組候位已經入座了";
                default -> "這組候位已經結束（放棄或過號）";
            };
            throw ApiException.conflict("WAITLIST_STATUS", message);
        }
        LocalDateTime now = now();
        ensureWithinCallWindow(waitlist, now);
        Integer adults = waitlist.getAdultCount();
        Integer children = waitlist.getChildCount();
        Integer partySize = waitlist.getPartySize();
        if (adults == null || children == null || partySize == null || adults < 0 || children < 0
                || partySize < 1 || partySize > 20 || (long) adults + children != partySize) {
            throw ApiException.conflict("WAITLIST_STATUS", "這組候位的人數資料不一致");
        }
        if (waitlist.getDiningSessionId() != null || waitlists.countSessionsByWaitlistId(id) > 0) {
            throw ApiException.conflict("WAITLIST_STATUS", "這組候位已有用餐紀錄");
        }

        DiningSessionEntity session = tableService.openSession(
                tableId, waitlist.getAdultCount(), waitlist.getChildCount());
        session.setWaitlistId(waitlist.getId());
        waitlist.seat(session.getId(), now());
        notifier.notifyUpdatedAfterCommit();
        return WaitlistResponse.from(waitlist);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public int expireOverdue() {
        LocalDateTime deadline = now().minusMinutes(CALL_EXPIRE_MINUTES);
        List<Long> candidateIds = waitlists.findOverdueIds(deadline);
        int expired = 0;
        for (Long id : candidateIds) {
            WaitlistEntity waitlist = locked(id);
            LocalDateTime now = now();
            if ("CALLED".equals(waitlist.getStatus()) && waitlist.getCalledAt() != null
                    && !now.isBefore(waitlist.getCalledAt().plusMinutes(CALL_EXPIRE_MINUTES))) {
                waitlist.expire(now);
                expired++;
            }
        }
        if (expired > 0) {
            notifier.notifyUpdatedAfterCommit();
        }
        return expired;
    }

    private void ensureWithinCallWindow(WaitlistEntity waitlist, LocalDateTime now) {
        if (waitlist.getCalledAt() == null
                || !now.isBefore(waitlist.getCalledAt().plusMinutes(CALL_EXPIRE_MINUTES))) {
            throw ApiException.conflict("WAITLIST_EXPIRED", "這組候位已超過叫號後 10 分鐘期限");
        }
    }

    private WaitlistEntity locked(Long id) {
        return waitlists.findByIdForUpdate(id)
                .orElseThrow(() -> ApiException.notFound("找不到這組候位"));
    }

    private static LocalDateTime now() {
        return LocalDateTime.now(ZONE);
    }
}
