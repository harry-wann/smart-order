package tw.ispan.smartorder.reservation.scheduler

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import tw.ispan.smartorder.reservation.service.ReservationJobService

@Component
class ReservationScheduler(
    private val jobService: ReservationJobService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(cron = "0 */5 * * * *", zone = "Asia/Taipei")
    fun markNoShow() {
        val count = jobService.markNoShow()
        if (count > 0) log.info("NO_SHOW 排程標記 {} 筆", count)
    }

    @Scheduled(cron = "0 */15 * * * *", zone = "Asia/Taipei")
    fun sendReminders() {
        val count = jobService.sendReminders()
        if (count > 0) log.info("訂位提醒排程送出 {} 筆", count)
    }
}
