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
}