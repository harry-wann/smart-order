
package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "cart_item")
public class CartItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dining_session_id")
    private DiningSessionEntity diningSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_item_id")
    private MenuItemEntity menuItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "added_by_guest_id")
    private DiningSessionGuestEntity addedByGuest;

    @Setter
    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "unit_price")
    private BigDecimal unitPrice;

    @Column(name = "note")
    private String note;

    public Long getId() {
        return id;
    }

    public DiningSessionEntity getDiningSession() {
        return diningSession;
    }

    public MenuItemEntity getMenuItem() {
        return menuItem;
    }

    public DiningSessionGuestEntity getAddedByGuest() {
        return addedByGuest;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public String getNote() {
        return note;
    }

}
