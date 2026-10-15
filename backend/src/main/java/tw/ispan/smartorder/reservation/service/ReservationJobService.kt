package tw.ispan.smartorder.reservation.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tw.ispan.smartorder.reservation.config.ReservationProperties
import tw.ispan.smartorder.reservation.enums.ReservationStatus
import tw.ispan.smartorder.reservation.repository.ReservationRepository
import java.time.Clock
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit

// 排程與手動觸發 API 共用的邏輯；排程那邊只負責呼叫和記日誌
@Service
class ReservationJobService(
    private val reservationRepo: ReservationRepository,
    private val properties: ReservationProperties,
    private val clock: Clock,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    // 過了訂位時間 10 分鐘還沒報到就是 NO_SHOW；報到 API 自己也會擋，不靠這支即時
    @Transactional
    fun markNoShow(): Int {
        val cutoff = LocalDateTime.now(clock).minusMinutes(properties.holdAfterMinutes)
        return reservationRepo.markNoShowBefore(cutoff, ReservationStatus.CONFIRMED, ReservationStatus.NO_SHOW)
    }

    // 用餐前 2 小時提醒。排程每 15 分鐘跑一次，所以只抓接下來這 15 分鐘落在 2 小時後的訂位，
    // 每筆只會被抓到一次。還沒有簡訊／推播通道，先記進日誌
    @Transactional(readOnly = true)
    fun sendReminders(): Int {
        // 截到分鐘：排程會晚幾毫秒才跑，不截的話整點、半點的訂位會被前一輪先抓走，提早 15 分鐘提醒
        val from = LocalDateTime.now(clock).truncatedTo(ChronoUnit.MINUTES).plusMinutes(REMIND_BEFORE_MINUTES)
        val reservations = reservationRepo.findByStatusAndStartTimeGreaterThanEqualAndStartTimeLessThan(
            ReservationStatus.CONFIRMED,
            from,
            from.plusMinutes(REMIND_INTERVAL_MINUTES),
        )
        reservations.forEach {
            log.info("訂位提醒：{} {} {} 位，{}", it.reservationNo, it.contactName, it.partySize, it.startTime)
        }
        return reservations.size
    }

    companion object {
        private const val REMIND_BEFORE_MINUTES = 120L
        const val REMIND_INTERVAL_MINUTES = 15L
    }
}
