package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tw.ispan.smartorder.reservation.enums.CancelSource;
import tw.ispan.smartorder.reservation.enums.ReservationStatus;

import java.time.LocalDateTime;

// 原檔名 ReservationEntity.kt
// 原路徑 tw.ispan.smartorder.reservation.entity

@Entity
@Table(name = "reservation")
@Getter
@Setter
@NoArgsConstructor
public class ReservationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String reservationNo;
    private Long memberId;
    private String contactName;
    private String contactPhone;
    private String contactEmail;
    private LocalDateTime startTime;

    // start + 用餐 100 分 + 清桌 15 分
    private LocalDateTime endTime;

    private Integer adultCount = 0;
    private Integer childCount = 0;
    private Integer partySize = 0;

    // 訂位當下配到的桌，只用在容量與重疊判斷；報到時坐別張桌也不改它
    private Long tableId;

    @Enumerated(EnumType.STRING)
    private ReservationStatus status = ReservationStatus.CONFIRMED;

    private String accessToken;
    private LocalDateTime cancelledAt;
    private Long cancelledByStaffId;

    @Enumerated(EnumType.STRING)
    private CancelSource cancelSource;

    @Column(insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    // table_id 清成 NULL 才會釋放 UNIQUE(table_id, start_time)，那個時段的名額跟著回來
    public void cancel(CancelSource source, Long staffId, LocalDateTime now) {
        status = ReservationStatus.CANCELLED;
        cancelledAt = now;
        cancelSource = source;
        cancelledByStaffId = staffId;
        tableId = null;
    }
}
