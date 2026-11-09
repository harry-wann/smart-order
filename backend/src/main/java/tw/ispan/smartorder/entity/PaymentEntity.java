package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment")
@Getter
@Setter
@NoArgsConstructor
public class PaymentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dining_session_id")
    private Long diningSessionId;

    // CASH / CARD / BARCODE
    @Column(name = "method")
    private String method;

    @Column(name = "amount")
    private BigDecimal amount;

    // PENDING / SUCCESS / FAILED / SUPERSEDED / REQUIRES_REVIEW / REFUNDED
    // SUPERSEDED：綠界查詢確認沒付成功，已由新的交易編號取代
    @Column(name = "status")
    private String status;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "transaction_no")
    private String transactionNo;

    // 發起線上付款的同桌 guest；只有本人能作廢自己的待確認付款
    @Column(name = "created_by_guest_id")
    private Long createdByGuestId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
