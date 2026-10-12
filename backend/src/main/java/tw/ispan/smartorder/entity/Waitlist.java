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