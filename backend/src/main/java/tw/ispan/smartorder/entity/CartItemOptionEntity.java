package tw.ispan.smartorder.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "cart_item_option")
@IdClass(CartItemOptionIdEntity.class)
public class CartItemOptionEntity {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_item_id")
    private CartItemEntity cartItem;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_value_id")
    private OptionValueEntity optionValue;

    public CartItemEntity getCartItem() {
        return cartItem;
    }

    public void setCartItem(CartItemEntity cartItem) {
        this.cartItem = cartItem;
    }

    public OptionValueEntity getOptionValue() {
        return optionValue;
    }

    public void setOptionValue(OptionValueEntity optionValue) {
        this.optionValue = optionValue;
    }
}