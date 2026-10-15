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

    // BCrypt。salt 包在字串裡、每次雜湊結果都不同，所以不能拿字串比對，要用 matches
    private String passwordHash;

    private String displayName;

    // COUNTER / KITCHEN / MANAGER
    private String role;

    // 停用不刪帳號：代客取消的紀錄（cancelled_by_staff_id）還要對得到人。
    // 登入會擋停用的帳號，但已經簽出去的 JWT 不會立刻失效，見 StaffJwtFilter
    private Boolean active = true;

    @Column(insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
