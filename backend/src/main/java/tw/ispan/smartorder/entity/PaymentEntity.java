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

    // PENDING / SUCCESS / FAILED / REFUNDED
    @Column(name = "status")
    private String status;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}
