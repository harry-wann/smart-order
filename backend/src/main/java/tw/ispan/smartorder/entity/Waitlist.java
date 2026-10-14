package tw.ispan.smartorder.entity;

import java.time.LocalDateTime;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "waitlist")
public class Waitlist {

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

    protected Waitlist() {}
    // 現場登記：建立一筆新的候位
    public static Waitlist register(String ticketNo, String contactName, String contactPhone, Integer partySize) {
        Waitlist w = new Waitlist();
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

    // 叫號：狀態改成已叫號，記下叫號時間（排程用它算 10 分鐘過號）
    public void call() {
        this.status = "CALLED";
        this.calledAt = LocalDateTime.now();
    }

    // 放棄：客人不等了
    public void abandon() {
        this.status = "ABANDONED";
    }



    public Long getId() {
        return id;
    }

    public String getTicketNo() {
        return ticketNo;
    }

    public String getContactName() {
        return contactName;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public Integer getAdultCount() {
        return adultCount;
    }

    public Integer getChildCount() {
        return childCount;
    }

    public Integer getPartySize() {
        return partySize;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getCalledAt() {
        return calledAt;
    }

    public LocalDateTime getSeatedAt() {
        return seatedAt;
    }

    public Long getDiningSessionId() {
        return diningSessionId;
    }
}