package tw.ispan.smartorder.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "waitlist")
@Getter
@Setter
@NoArgsConstructor
public class WaitlistEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String ticketNo;
    private String contactName;
    private String contactPhone;
    private Integer adultCount;
    private Integer childCount;
    private Integer partySize;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime calledAt;
    private LocalDateTime seatedAt;
    private Long diningSessionId;

    // 現場取號：建立一筆等待中的候位
    public static WaitlistEntity register(String ticketNo, String contactName, String contactPhone, Integer partySize) {
        WaitlistEntity w = new WaitlistEntity();
        w.ticketNo = ticketNo;
        w.contactName = contactName;
        w.contactPhone = contactPhone;
        w.partySize = partySize;
        w.adultCount = partySize;
        w.childCount = 0;
        w.status = "WAITING";
        w.createdAt = LocalDateTime.now();
        return w;
    }

    // 叫號：WAITING → CALLED  記下叫號時間（排程用它算 10 分鐘過號）」
    public void call() {
        this.status = "CALLED";
        this.calledAt = LocalDateTime.now();
    }

    // 放棄：客人不等了
    public void abandon() {
        this.status = "ABANDONED";
    }

    // 報到入座：記下入座時間，以及開出來的那筆用餐紀錄
    public void seat(Long diningSessionId) {
        this.status = "SEATED";
        this.seatedAt = LocalDateTime.now();
        this.diningSessionId = diningSessionId;
    }

    // 過號：叫號後太久沒報到，排程自動標記
    public void expire() {
        this.status = "EXPIRED";
    }

}