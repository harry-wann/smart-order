package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "verification_code")
@Getter @Setter
@NoArgsConstructor
public class VerificationCodeEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String phone;
	private String code;
	private int attemptCount;
	private LocalDateTime expiresAt;
	private LocalDateTime usedAt;
	// 由程式寫入（不用資料庫預設值），跟 expiresAt 同一個時鐘；限流與清理排程都拿它比時間
	private LocalDateTime createdAt;
}