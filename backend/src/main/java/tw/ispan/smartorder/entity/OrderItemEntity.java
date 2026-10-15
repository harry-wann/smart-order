package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Data
@Table(name = "order_item")
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

    @Column(name = "note")
    private String note;

    @Column(name = "status")
    private String status;

    @Column(name = "line_total")
    private BigDecimal lineTotal;

}
