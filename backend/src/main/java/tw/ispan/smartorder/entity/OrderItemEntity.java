package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_item")
@Getter
@Setter
@NoArgsConstructor
public class OrderItemEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_ticket_id")
    private Long orderTicketId;

    @Column(name = "menu_item_id")
    private Long menuItemId;

    @Column(name = "item_name_snapshot")
    private String itemNameSnapshot;

    @Column(name = "unit_price_snapshot")
    private BigDecimal unitPriceSnapshot;

    @Column(name = "options_price")
    private BigDecimal optionsPrice;

    @Column(name = "quantity")
    private Integer quantity;

    // 送單時有沒有扣庫存；取消時依這個決定要不要補回，不看品項現在的 track_inventory（店長可能已經改過）。
    // 欄位 NOT NULL，新增時一定要設，不設會在寫入時直接出錯
    @Column(name = "stock_deducted", nullable = false)
    private Boolean stockDeducted;

    @Column(name = "note")
    private String note;

    @Column(name = "status")
    private String status;

    @Column(name = "served_at")
    private LocalDateTime servedAt;

    @Column(name = "line_total")
    private BigDecimal lineTotal;
}
