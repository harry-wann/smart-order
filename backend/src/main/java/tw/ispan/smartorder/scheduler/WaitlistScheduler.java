package tw.ispan.smartorder.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tw.ispan.smartorder.service.WaitlistService;

// 候位過號排程：邏輯在 WaitlistService.expireOverdue()，這裡只負責定時呼叫和記日誌
// @EnableScheduling 哈利已經開在 ReservationConfig.kt，這裡不用再開
@Component
public class WaitlistScheduler {

    private static final Logger log = LoggerFactory.getLogger(WaitlistScheduler.class);

    @Autowired
    private WaitlistService waitlistService;

    // 每分鐘整點跑一次（cron 欄位：秒 分 時 日 月 週）
    // 過號是 10 分鐘，每分鐘檢查，最慢 11 分鐘內會被標到
    @Scheduled(cron = "0 * * * * *")
    public void expireCalled() {
        int count = waitlistService.expireOverdue();
        if (count > 0) {
            log.info("候位過號排程標記 {} 組", count);
        }
    }
}