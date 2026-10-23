package tw.ispan.smartorder.reservation.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tw.ispan.smartorder.reservation.service.ReservationJobService;

// 邏輯都在 ReservationJobService，這裡只呼叫和記日誌，手動觸發的 API 才能共用同一份。
// cron 欄位是「秒 分 時 日 月 週」。zone 跟 Clock 讀同一個 reservation.zone，
// 觸發時間和程式裡判斷的「現在」不會各用各的時區。
// zone 的字串值使用 Spring ${reservation.zone} 佔位符，讓設定與 Clock 共用同一個時區。
@Component
public class ReservationScheduler {
    private static final Logger log = LoggerFactory.getLogger(ReservationScheduler.class);
    private final ReservationJobService jobService;

    public ReservationScheduler(ReservationJobService jobService) {
        this.jobService = jobService;
    }

    // 每 5 分鐘。保留只有 10 分鐘，最慢 15 分鐘內會標到；報到和開桌清單自己看時間，不等這支
    @Scheduled(cron = "0 */5 * * * *", zone = "${reservation.zone}")
    public void markNoShow() {
        int count = jobService.markNoShow();
        if (count > 0) {
            log.info("NO_SHOW 排程標記 {} 筆", count);
        }
    }

    // 每 15 分鐘。提醒窗是「現在 ～ 現在 + 2 小時」，靠 reminder_sent_at 去重，跟間隔長短無關；
    // 間隔只決定訂位進入 2 小時內之後最晚多久會被提醒到（最多晚 15 分）
    @Scheduled(cron = "0 */15 * * * *", zone = "${reservation.zone}")
    public void sendReminders() {
        int count = jobService.sendReminders();
        if (count > 0) {
            log.info("訂位提醒排程新提醒 {} 筆（模擬簡訊）", count);
        }
    }
}
