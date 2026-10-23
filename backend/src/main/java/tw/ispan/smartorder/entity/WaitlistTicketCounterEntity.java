package tw.ispan.smartorder.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "waitlist_ticket_counter")
@Getter
@Setter
public class WaitlistTicketCounterEntity {
    @Id
    private Integer id;

    @Column(name = "next_no", nullable = false)
    private Long nextNo;
}
