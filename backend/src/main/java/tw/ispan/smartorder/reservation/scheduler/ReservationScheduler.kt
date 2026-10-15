package tw.ispan.smartorder.reservation.scheduler

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import tw.ispan.smartorder.reservation.service.ReservationJobService

// 邏輯都在 ReservationJobService，這裡只呼叫和記日誌，手動觸發的 API 才能共用同一份。
// cron 欄位是「秒 分 時 日 月 週」。zone 跟 Clock 讀同一個 reservation.zone，
// 觸發時間和程式裡判斷的「現在」不會各用各的時區。
// 字串裡的 \$ 是 Kotlin 的跳脫，實際交給 Spring 的是 ${reservation.zone} 這個佔位符
@Component
class ReservationScheduler(
    private val jobService: ReservationJobService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    // 每 5 分鐘。保留只有 10 分鐘，最慢 15 分鐘內會標到；報到和開桌清單自己看時間，不等這支
    @Scheduled(cron = "0 */5 * * * *", zone = "\${reservation.zone}")
    fun markNoShow() {
        val count = jobService.markNoShow()
        if (count > 0) log.info("NO_SHOW 排程標記 {} 筆", count)
    }

    // 每 15 分鐘，間隔要等於 ReservationJobService.REMIND_INTERVAL_MINUTES，提醒窗才接得起來
    @Scheduled(cron = "0 */15 * * * *", zone = "\${reservation.zone}")
    fun sendReminders() {
        val count = jobService.sendReminders()
        if (count > 0) log.info("訂位提醒排程送出 {} 筆", count)
    }
}
