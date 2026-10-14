package tw.ispan.smartorder.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "cart_item_option")
@IdClass(CartItemOptionId.class)
public class CartItemOption {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_item_id")
    private CartItem cartItem;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_value_id")
    private OptionValueEntity optionValue;

    public CartItem getCartItem() {
        return cartItem;
    }

    public void setCartItem(CartItem cartItem) {
        this.cartItem = cartItem;
    }

    public OptionValueEntity getOptionValue() {
        return optionValue;
    }

    public void setOptionValue(OptionValueEntity optionValue) {
        this.optionValue = optionValue;
    }
}