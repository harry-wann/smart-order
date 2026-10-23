package tw.ispan.smartorder.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tw.ispan.smartorder.service.TableReminderService;

// 桌位提醒排程：邏輯在 TableReminderService，這裡只負責定時呼叫和記日誌
// @EnableScheduling 已經開在 ReservationConfig，這裡不用再開
@Component
public class TableReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(TableReminderScheduler.class);

    @Autowired
    private TableReminderService tableReminderService;

    // 每分鐘整點跑一次：用餐超過 100 分鐘的桌推給櫃檯
    @Scheduled(cron = "0 * * * * *", zone = "Asia/Taipei")
    public void checkOvertime() {
        try {
            int count = tableReminderService.checkOvertime();
            if (count > 0) {
                log.info("用餐超時掃描推播 {} 桌", count);
            }
        } catch (Exception e) {
            log.error("用餐超時掃描失敗", e);
        }
    }

    // 每 5 分鐘跑一次：待清理超過 15 分鐘的桌推給櫃檯
    @Scheduled(cron = "0 */5 * * * *", zone = "Asia/Taipei")
    public void remindCleaning() {
        try {
            int count = tableReminderService.remindCleaning();
            if (count > 0) {
                log.info("待清理提醒推播 {} 桌", count);
            }
        } catch (Exception e) {
            log.error("待清理提醒失敗", e);
        }
    }
}
