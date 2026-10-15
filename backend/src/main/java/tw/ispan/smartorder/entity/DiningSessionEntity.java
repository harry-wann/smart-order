package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "dining_session")
@Getter
@Setter
@NoArgsConstructor
public class DiningSessionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "table_id")
    private Long tableId;

    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "reservation_id")
    private Long reservationId;

    @Column(name = "waitlist_id")
    private Long waitlistId;

    @Column(name = "session_token")
    private String sessionToken;

    @Column(name = "adult_count")
    private Integer adultCount = 0;

    @Column(name = "child_count")
    private Integer childCount = 0;

    // OPEN / PAID / CANCELLED
    @Column(name = "status")
    private String status = "OPEN";

    @Column(name = "subtotal")
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "service_fee")
    private BigDecimal serviceFee = BigDecimal.ZERO;

    @Column(name = "total")
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "cart_version")
    private Long cartVersion = 0L;

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id", insertable = false, updatable = false)
    private DiningTableEntity diningTable;

    // 修改購物車後增加版本號
    public void increaseCartVersion() {
        this.cartVersion =
                (this.cartVersion == null ? 0 : this.cartVersion) + 1;
    }
}
