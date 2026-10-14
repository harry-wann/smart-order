package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "payment")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dining_session_id")
    private Long diningSessionId;

    @Column(name = "method")
    private String method;

    @Column(name = "amount")
    private BigDecimal amount;

    @Column(name = "status")
    private String status;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    protected Payment() {
    }

    public Payment(
            Long diningSessionId,
            String method,
            BigDecimal amount
    ) {
        this.diningSessionId = diningSessionId;
        this.method = method;
        this.amount = amount;
        this.status = "SUCCESS";
        this.paidAt = LocalDateTime.now();
    }


}