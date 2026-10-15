package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_item_option")
@Getter
@Setter
@NoArgsConstructor
public class OrderItemOptionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 餐點 ID
    @Column(name = "order_item_id")
    private Long orderItemId;

    // 餐點關聯
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "order_item_id",
            insertable = false,
            updatable = false
    )
    private OrderItemEntity orderItem;

    // group
    @Column(name = "group_name_snapshot")
    private String groupNameSnapshot;

    // value
    @Column(name = "value_name_snapshot")
    private String valueNameSnapshot;

    // 加價
    @Column(name = "price_delta")
    private BigDecimal priceDelta;

    // 時間
    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    // 更新時間
    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
