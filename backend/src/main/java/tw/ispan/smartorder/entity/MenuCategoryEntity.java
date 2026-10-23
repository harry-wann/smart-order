package tw.ispan.smartorder.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "menu_category")
@Getter
@Setter
@NoArgsConstructor
public class MenuCategoryEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private Integer sortOrder;
    // 出餐順序（04 §4.12）：1 鍋底、2 菜盤、3 火鍋料、4 肉品、5 主食、6 飲料甜點。
    // 出菜看板依這個值排同一張單的品項，不看分類名稱，店長改名也不會亂掉
    private Integer cookOrder;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 只用來查詢（算品項數量）。不要加 cascade：加了 ALL 之後刪分類會連底下的品項一起刪
    @OneToMany(mappedBy = "category", fetch = FetchType.LAZY)
    @JsonIgnore
    private List<MenuItemEntity> menuItems;
}
