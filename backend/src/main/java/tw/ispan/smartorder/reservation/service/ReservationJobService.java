package tw.ispan.smartorder.reservation.service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
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
    private static final DateTimeFormatter MONTH_DAY_TIME = DateTimeFormatter.ofPattern("M/d HH:mm");
    // 用餐前 2 小時發提醒（M7 7.12）。seed 的 generate_seed.py 預先標記已提醒時也用這個長度
    private static final long REMIND_BEFORE_MINUTES = 120L;

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

    // 用餐前 2 小時提醒（模擬簡訊）：CONFIRMED、還沒提醒過、開始時間落在「現在 ～ 現在 + 2 小時」的訂位。
    // 沒有真的簡訊通道，「送出」是記一行日誌，並把送出時間寫進 reminder_sent_at，店家端看得到。
    //
    // 同一筆只提醒一次：排程和手動 API 可能同時跑，所以不能先查再記。
    // 每一筆都先用條件式 UPDATE（reminder_sent_at 還是 NULL 才寫）搶資格，搶到（影響 1 列）才送出，
    // 兩邊同時搶同一筆只有一邊拿得到。回傳的是這次真正新提醒的筆數，不是候選筆數。
    //
    // 這個方法刻意不開交易：搶資格的 UPDATE 一筆一個交易、馬上 commit，
    // 別人才看得到已經有人提醒了，而且日誌是在 commit 之後才寫，不會出現「記了但最後 rollback」。
    // 代價是搶到之後、寫日誌之前程式掛掉的話那筆不會補提醒，寧可漏一次也不重複通知
    public int sendReminders() {
        // 截到毫秒，寫進 DATETIME(3) 的值不會被資料庫四捨五入成跟這裡不一樣
        LocalDateTime now = LocalDateTime.now(clock).truncatedTo(ChronoUnit.MILLIS);
        int sent = 0;
        for (ReservationEntity reservation : reservationRepo.findToRemind(
                ReservationStatus.CONFIRMED, now, now.plusMinutes(REMIND_BEFORE_MINUTES))) {
            if (reservationRepo.markReminded(reservation.getId(), now) == 1) {
                simulateSms(reservation);
                sent++;
            }
        }
        return sent;
    }

    // 模擬簡訊：不串真的簡訊，只記日誌。手機號碼遮成 0912***678，內容有店名、時間、人數。
    // 訂位保留的分鐘數跟報到 API 用同一個設定，文案才不會跟實際規則對不上
    private void simulateSms(ReservationEntity reservation) {
        String message = String.format("【%s】%s 您好，提醒您 %s 的訂位（%d 位），訂位保留 %d 分鐘，請準時抵達。",
                properties.getStoreName(),
                reservation.getContactName(),
                reservation.getStartTime().format(MONTH_DAY_TIME),
                reservation.getPartySize(),
                properties.getHoldAfterMinutes());
        log.info("訂位提醒（模擬簡訊，沒有真的發送）{} → {}：{}",
                reservation.getReservationNo(), maskPhone(reservation.getContactPhone()), message);
    }

    // 0912345678 → 0912***678，跟 AdminReservationService.maskPhone 同一種遮法
    private static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 4) + "***" + phone.substring(phone.length() - 3);
    }
}
