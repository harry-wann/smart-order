package tw.ispan.smartorder.reservation.service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.reservation.config.ReservationProperties;
import tw.ispan.smartorder.reservation.enums.ReservationStatus;
import tw.ispan.smartorder.reservation.repository.ReservationRepository;
import tw.ispan.smartorder.entity.ReservationEntity;

// 排程與手動觸發 API（demo 用，不用真的等 10 分鐘）共用的邏輯；排程那邊只呼叫和記日誌
@Service
public class ReservationJobService {
    private static final Logger log = LoggerFactory.getLogger(ReservationJobService.class);
    private static final long REMIND_BEFORE_MINUTES = 120L;
    // 要跟 ReservationScheduler 的 cron 間隔（每 15 分）一致，不然提醒窗會重疊或留縫
    public static final long REMIND_INTERVAL_MINUTES = 15L;

    private final ReservationRepository reservationRepo;
    private final ReservationProperties properties;
    private final Clock clock;

    public ReservationJobService(ReservationRepository reservationRepo, ReservationProperties properties, Clock clock) {
        this.reservationRepo = reservationRepo;
        this.properties = properties;
        this.clock = clock;
    }

    // 過了訂位時間 10 分鐘還沒報到就是 NO_SHOW；報到 API 自己也會擋，不靠這支即時。
    // 桌位不用動：保留是算出來的，窗一過就自己消失，排程晚跑幾分鐘不影響桌況和開桌清單。
    // 一句批次 UPDATE 標完，where 帶 status = CONFIRMED，剛好被報到的那筆不會被蓋成 NO_SHOW；
    // 界線 start < now−10 跟 seat() 的 RESERVATION_EXPIRED 是同一條
    @Transactional
    public int markNoShow() {
        LocalDateTime cutoff = LocalDateTime.now(clock).minusMinutes(properties.getHoldAfterMinutes());
        return reservationRepo.markNoShowBefore(cutoff, ReservationStatus.CONFIRMED, ReservationStatus.NO_SHOW);
    }

    // 用餐前 2 小時提醒。排程每 15 分鐘跑一次，所以只抓 [now+120, now+135) 這段的訂位，
    // 前後兩輪剛好接起來，每筆只會被抓到一次，也就不用另外存「已提醒」的欄位。
    // 還沒有簡訊／推播通道，先記進日誌
    @Transactional(readOnly = true)
    public int sendReminders() {
        // 截到分鐘：排程會晚幾毫秒才跑，不截的話整點、半點的訂位會被前一輪先抓走，提早 15 分鐘提醒。
        // 截完 from 剛好落在整點、15、30、45 分，下一輪的起點就是這一輪的終點
        LocalDateTime from = LocalDateTime.now(clock)
                .truncatedTo(ChronoUnit.MINUTES)
                .plusMinutes(REMIND_BEFORE_MINUTES);
        List<ReservationEntity> reservations = reservationRepo.findByStatusAndStartTimeGreaterThanEqualAndStartTimeLessThan(
                ReservationStatus.CONFIRMED,
                from,
                from.plusMinutes(REMIND_INTERVAL_MINUTES));
        reservations.forEach(reservation -> log.info("訂位提醒：{} {} {} 位，{}",
                reservation.getReservationNo(),
                reservation.getContactName(),
                reservation.getPartySize(),
                reservation.getStartTime()));
        return reservations.size();
    }
}
