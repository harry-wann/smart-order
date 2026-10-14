package tw.ispan.smartorder.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "dining_session_guest")
public class DiningSessionGuest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "display_name")
    private String displayName;

    private Long diningSessionId;
    private String deviceId;
    private LocalDateTime joinedAt;
}
