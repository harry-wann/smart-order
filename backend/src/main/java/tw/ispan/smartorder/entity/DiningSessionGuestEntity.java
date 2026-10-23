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
    // 前端帶的 X-Device-Id，只供顯示／診斷；可偽造，不能拿來找 guest 或判斷身分
    private String deviceId;
    // X-Guest-Token 的 SHA-256 雜湊（原始值不存）；舊資料沒有就是 NULL
    private String guestTokenHash;
    private LocalDateTime joinedAt;
}
