package tw.ispan.smartorder.reservation.service;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import tw.ispan.smartorder.entity.ReservationEntity;
import tw.ispan.smartorder.reservation.config.ReservationProperties;
import tw.ispan.smartorder.reservation.dto.response.HeldForResponse;
import tw.ispan.smartorder.reservation.enums.ReservationStatus;
import tw.ispan.smartorder.reservation.repository.ReservationRepository;

// 預約保留不存在桌位欄位裡，每次都從訂位算出來（M2 問題 5），所以沒有排程同步的問題：
// 訂位一離開 CONFIRMED（取消、報到、NO_SHOW）或保留窗過了，條件就不成立，保留自己消失，
// 沒有哪個地方需要記得「把桌子改回來」。
// 用法是先 snapshot() 查一次，再對很多張桌問 heldBy / upcoming，不要每張桌各查一次資料庫。
@Service
public class TableHoldService {
    private final ReservationRepository reservationRepo;
    private final ReservationProperties properties;

    public TableHoldService(ReservationRepository reservationRepo, ReservationProperties properties) {
        this.reservationRepo = reservationRepo;
        this.properties = properties;
    }

    // 一次查出現在需要的訂位：保留窗內的（start 在 now−10 ~ now+30）與 115 分鐘內要開始的。
    // 下限 now−10 是保留窗的尾巴；上限取 115 和 30 較大的那個，30 就被包在 115 裡面，一次查完兩種用途
    public TableHolds snapshot(LocalDateTime now) {
        List<ReservationEntity> reservations = reservationRepo
                .findByStatusAndTableIdIsNotNullAndStartTimeGreaterThanEqualAndStartTimeLessThanEqual(
                        ReservationStatus.CONFIRMED,
                        now.minusMinutes(properties.getHoldAfterMinutes()),
                        now.plusMinutes(Math.max(properties.getOccupyMinutes(), properties.getHoldBeforeMinutes())));
        return new TableHolds(reservations, now, properties);
    }

    public HeldForResponse toHeldFor(ReservationEntity reservation) {
        if (reservation == null) {
            return null;
        }
        return new HeldForResponse(
                reservation.getId(),
                reservation.getReservationNo() == null ? "" : reservation.getReservationNo(),
                reservation.getContactName(),
                reservation.getPartySize(),
                properties.toOffset(reservation.getStartTime()));
    }
}
