package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "dining_session_guest")
public class DiningSessionGuestEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "display_name")
    private String displayName;

    private Long diningSessionId;
    private String deviceId;
    private LocalDateTime joinedAt;
}
