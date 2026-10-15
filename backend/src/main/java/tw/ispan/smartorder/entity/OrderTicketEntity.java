package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "order_ticket")
public class OrderTicketEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter
    @Column(name = "dining_session_id")
    private Long diningSessionId;

    @Setter
    @Column(name = "sequence_no")
    private Integer sequenceNo;

    @Setter
    @Column(name = "status")
    private String status;

    @Setter
    @Column(name = "source")
    private String source;

    @Setter
    @Column(name = "submitted_by_guest_id")
    private Long submittedByGuestId;

    @Setter
    @Column(name = "placed_at")
    private LocalDateTime placedAt;

    public Long getId() { return id; }
    public Long getDiningSessionId() { return diningSessionId; }

    public Integer getSequenceNo() { return sequenceNo; }

    public String getStatus() { return status; }

    public String getSource() { return source; }

    public Long getSubmittedByGuestId() { return submittedByGuestId; }

    public LocalDateTime getPlacedAt() { return placedAt; }
}
