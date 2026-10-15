package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "dining_session_guest")
@Getter
@Setter
@NoArgsConstructor
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
