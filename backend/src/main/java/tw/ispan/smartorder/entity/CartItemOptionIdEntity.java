package tw.ispan.smartorder.entity;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

// cart_item_option 的複合主鍵；JPA 用 equals/hashCode 比對主鍵，所以要 @EqualsAndHashCode
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CartItemOptionIdEntity implements Serializable {

    private Long cartItem;
    private Long optionValue;
}
