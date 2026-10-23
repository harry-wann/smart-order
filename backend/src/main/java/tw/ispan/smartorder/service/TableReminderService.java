package tw.ispan.smartorder.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import tw.ispan.smartorder.repository.DiningSessionRepository;
import tw.ispan.smartorder.repository.DiningSessionRepository.TableReminderRow;

// M2 的兩個提醒：用餐超時（TABLE_OVERTIME）、待清理太久（TABLE_CLEANING_OVERDUE），都推到 /topic/counter 給櫃檯。
// 排程（TableReminderScheduler）和手動觸發 API（TableSchedulerController）共用這裡，邏輯只有一份。
// 這兩個提醒不寫資料庫：先在唯讀交易裡查完，交易結束後才推播，不占著連線等推播。
@Service
public class TableReminderService {

    private static final Logger log = LoggerFactory.getLogger(TableReminderService.class);
    private static final ZoneId ZONE = ZoneId.of("Asia/Taipei");

    public static final String TYPE_OVERTIME = "TABLE_OVERTIME";
    public static final String TYPE_CLEANING_OVERDUE = "TABLE_CLEANING_OVERDUE";

    // 用餐超過幾分鐘要提醒櫃檯。出處：docs/tech/realtime/43-排程與Cron.md「用餐超時掃描」、
    // docs/spec/04-API規格.md 的 TABLE_OVERTIME
    static final int OVERTIME_MINUTES = 100;

    // 待清理超過幾分鐘要提醒。出處：docs/tech/realtime/43-排程與Cron.md「待清理提醒」
    static final int CLEANING_OVERDUE_MINUTES = 15;

    // 推播訊息跟 TableStatusNotifier 一樣是平鋪欄位；minutes 是已用餐／已待清理的整數分鐘
    public record ReminderMessage(String type, Long tableId, String tableNo, long minutes) {}

    private final SimpMessagingTemplate messagingTemplate;
    private final DiningSessionRepository diningSessions;
    private final TransactionTemplate readOnly;

    public TableReminderService(
            SimpMessagingTemplate messagingTemplate,
            DiningSessionRepository diningSessions,
            PlatformTransactionManager transactionManager) {
        this.messagingTemplate = messagingTemplate;
        this.diningSessions = diningSessions;
        this.readOnly = new TransactionTemplate(transactionManager);
        this.readOnly.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        this.readOnly.setReadOnly(true);
    }

    // 用餐超時掃描：用餐中且開桌超過 100 分鐘的桌，每桌推一則 TABLE_OVERTIME；回傳推了幾桌
    public int checkOvertime() {
        LocalDateTime now = LocalDateTime.now(ZONE);
        // 規格是「超過」100 分鐘：分鐘數無條件捨去後要大於 100，也就是滿 101 分鐘，跟桌格變紅的條件一致
        List<TableReminderRow> rows = readOnly.execute(
                ignored -> diningSessions.findOvertimeTables(now.minusMinutes(OVERTIME_MINUTES + 1)));
        return publish(TYPE_OVERTIME, rows, now);
    }

    // 待清理提醒：桌子是 CLEANING 且結帳後超過 15 分鐘的桌，每桌推一則 TABLE_CLEANING_OVERDUE；回傳推了幾桌。
    // 「開始待清理」的時間取該桌最後一筆 PAID 紀錄的 closed_at（結帳當下桌子改成 CLEANING）。
    // 找不到已結帳紀錄的待清理桌（例如手動改過資料）沒有起算點，直接略過，不亂猜時間
    public int remindCleaning() {
        LocalDateTime now = LocalDateTime.now(ZONE);
        List<TableReminderRow> rows = readOnly.execute(
                ignored -> diningSessions.findCleaningOverdueTables(now.minusMinutes(CLEANING_OVERDUE_MINUTES)));
        return publish(TYPE_CLEANING_OVERDUE, rows, now);
    }

    // 一桌推失敗只記 warn，繼續推下一桌；不能讓排程或手動 API 因為推播回 500
    private int publish(String type, List<TableReminderRow> rows, LocalDateTime now) {
        if (rows == null) {
            return 0;
        }
        int pushed = 0;
        for (TableReminderRow row : rows) {
            long minutes = Math.max(0, Duration.between(row.getStartedAt(), now).toMinutes());
            try {
                messagingTemplate.convertAndSend(TableStatusNotifier.COUNTER_TOPIC,
                        new ReminderMessage(type, row.getTableId(), row.getTableNo(), minutes));
                pushed++;
            } catch (RuntimeException e) {
                log.warn("{} 推播失敗，桌號 {}，下一輪排程會再推", type, row.getTableNo(), e);
            }
        }
        return pushed;
    }
}
