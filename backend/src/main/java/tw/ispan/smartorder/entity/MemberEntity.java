package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "member")
@Getter @Setter
@NoArgsConstructor
public class MemberEntity {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String phone;
	private String nickname;
	private String gender;
	private LocalDate birthDate;
	private Boolean profileCompleted;
	private String status;

	@Column(updatable = false,insertable = false)
	private LocalDateTime createdAt;
}
