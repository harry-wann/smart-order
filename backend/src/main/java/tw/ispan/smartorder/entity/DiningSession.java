package tw.ispan.smartorder.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "dining_session")
public class DiningSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id")
    private DiningTable table;

    private Long memberId;
    private Long reservationId;
    private Long waitlistId;
    private String sessionToken;
    private Integer adultCount;
    private Integer childCount;
    private String status;
    private BigDecimal subtotal;
    private BigDecimal serviceFee;
    private BigDecimal total;
    private Long cartVersion;
    private LocalDateTime openedAt;
    private LocalDateTime closedAt;

    protected DiningSession() {}

    public Long getId() {
        return id;
    }

    public DiningTable getTable() {
        return table;
    }

    public Long getMemberId() {
        return memberId;
    }

    public Long getReservationId() {
        return reservationId;
    }

    public Long getWaitlistId() {
        return waitlistId;
    }

    public String getSessionToken() {
        return sessionToken;
    }

    public Integer getAdultCount() {
        return adultCount;
    }

    public Integer getChildCount() {
        return childCount;
    }

    public String getStatus() {
        return status;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public BigDecimal getServiceFee() {
        return serviceFee;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public Long getCartVersion() {
        return cartVersion;
    }

    public LocalDateTime getOpenedAt() {
        return openedAt;
    }

    public LocalDateTime getClosedAt() {
        return closedAt;
    }
}