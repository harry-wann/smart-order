package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

// 原檔名 StaffEntity.kt
// 原路徑 tw.ispan.smartorder.staff.entity

@Entity
@Table(name = "staff")
@Getter
@Setter
@NoArgsConstructor
public class StaffEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;

    // BCrypt
    private String passwordHash;

    private String displayName;

    // COUNTER / KITCHEN / MANAGER
    private String role;

    private Boolean active = true;

    @Column(insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
