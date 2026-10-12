package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name="dining_session_guest")
@Setter @Getter
@NoArgsConstructor
public class DiningSessionGuest {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private Long diningSessionId;
	private String deviceId;
	private String displayName;
	private LocalDateTime joinedAt;


}
