package tw.ispan.smartorder.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tw.ispan.smartorder.service.MemberAuthService;

// 驗證碼清理排程：邏輯在 MemberAuthService.deleteStaleCodes()，這裡只負責定時呼叫和記日誌
// 04 §2.5：九支排程裡只有這支沒有手動觸發 API，demo 不需要等它
@Component
public class VerificationCodeScheduler {

    private static final Logger log = LoggerFactory.getLogger(VerificationCodeScheduler.class);

    @Autowired
    private MemberAuthService memberAuthService;

    // 每 10 分鐘整點跑一次（cron 欄位：秒 分 時 日 月 週），對應 43-排程與Cron 的「驗證碼清理」
    @Scheduled(cron = "0 */10 * * * *", zone = "Asia/Taipei")
    public void deleteStaleCodes() {
        try {
            int count = memberAuthService.deleteStaleCodes();
            if (count > 0) {
                log.info("驗證碼清理排程刪除 {} 筆", count);
            }
        } catch (Exception e) {
            log.error("驗證碼清理失敗", e);
        }
    }
}
