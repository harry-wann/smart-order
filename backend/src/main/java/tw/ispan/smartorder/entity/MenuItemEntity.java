package tw.ispan.smartorder.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "menu_item")
@Getter
@Setter
@NoArgsConstructor
public class MenuItemEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private BigDecimal price;
    private String imageUrl;
    private Boolean isSoupBase;
    private Boolean trackInventory;
    private Boolean isRefill;
    private String suitableFor;
    private Integer spicyLevel;
    private Boolean isVegetarian;
    private Boolean containsBeef;
    private Boolean soldOut;
    private String sortOrder;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    @JsonIgnore
    private MenuCategoryEntity category;

    @OneToOne(mappedBy = "menuItem", fetch = FetchType.LAZY)
    @JsonIgnore
    private InventoryEntity inventory;
}
