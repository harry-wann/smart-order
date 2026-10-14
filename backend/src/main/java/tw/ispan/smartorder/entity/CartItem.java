
package tw.ispan.smartorder.entity;

import jakarta.persistence.*;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "cart_item")
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dining_session_id")
    private DiningSession diningSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "menu_item_id")
    private MenuItem menuItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "added_by_guest_id")
    private DiningSessionGuest addedByGuest;

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

    public DiningSession getDiningSession() {
        return diningSession;
    }

    public MenuItem getMenuItem() {
        return menuItem;
    }

    public DiningSessionGuest getAddedByGuest() {
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
