package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "order_ticket")
@Getter
@Setter
@NoArgsConstructor
public class OrderTicketEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dining_session_id")
    private Long diningSessionId;

    @Column(name = "sequence_no")
    private Integer sequenceNo;

    @Column(name = "status")
    private String status;

    @Column(name = "source")
    private String source;

    @Column(name = "submitted_by_guest_id")
    private Long submittedByGuestId;

    @Column(name = "placed_at")
    private LocalDateTime placedAt;
}
