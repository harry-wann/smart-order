package tw.ispan.smartorder.entity;

import java.io.Serializable;
import java.util.Objects;

public class CartItemOptionIdEntity implements Serializable {

    private Long cartItem;
    private Long optionValue;

    public CartItemOptionIdEntity() {
    }

    public CartItemOptionIdEntity(Long cartItem, Long optionValue) {
        this.cartItem = cartItem;
        this.optionValue = optionValue;
    }

    public Long getCartItem() {
        return cartItem;
    }

    public void setCartItem(Long cartItem) {
        this.cartItem = cartItem;
    }

    public Long getOptionValue() {
        return optionValue;
    }

    public void setOptionValue(Long optionValue) {
        this.optionValue = optionValue;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;

        if (!(obj instanceof CartItemOptionIdEntity other)) {
            return false;
        }

        return Objects.equals(cartItem, other.cartItem)
                && Objects.equals(optionValue, other.optionValue);
    }

    @Override
    public int hashCode() {
        return Objects.hash(cartItem, optionValue);
    }
}