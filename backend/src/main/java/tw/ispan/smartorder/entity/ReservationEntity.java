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

// 一筆訂位。table_id 是訂位當下 best-fit 配到的桌，報到後實際坐哪張記在 dining_session，兩邊不要混。
// member_id 是 NULL 就是匿名訂位，改用 accessToken 存取
@Entity
@Table(name = "reservation")
@Getter
@Setter
@NoArgsConstructor
public class ReservationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // R-yyMMdd-流水號，insert 拿到 id 才組得出來，所以一開始是 null（UNIQUE 不擋多個 NULL）
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

    // 選完時段送出就直接成立，沒有待確認的狀態，所以預設 CONFIRMED
    @Enumerated(EnumType.STRING)
    private ReservationStatus status = ReservationStatus.CONFIRMED;

    // 匿名客人存取這筆訂位的憑證，建立訂位時回給前端一次
    private String accessToken;
    private LocalDateTime cancelledAt;
    private Long cancelledByStaffId;

    @Enumerated(EnumType.STRING)
    private CancelSource cancelSource;

    // created_at / updated_at 由資料庫的 DEFAULT 和 ON UPDATE 填，JPA 不寫，所以 insertable / updatable 都關
    @Column(insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    // 取消：狀態、時間、來源一起改，table_id 清成 NULL。
    // 要清是因為 UNIQUE(table_id, start_time)：不清的話同一桌同一時段永遠不能再訂，
    // 而 NULL 在 UNIQUE 裡不算重複，名額就回來了（M7 問題 5 的解法 A）。
    // 預約保留只看 CONFIRMED 且有 table_id 的訂位，也跟著消失。
    // 代價是取消的訂位看不出原本配哪張桌
    public void cancel(CancelSource source, Long staffId, LocalDateTime now) {
        status = ReservationStatus.CANCELLED;
        cancelledAt = now;
        cancelSource = source;
        cancelledByStaffId = staffId;
        tableId = null;
    }
}
