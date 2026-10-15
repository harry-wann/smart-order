package tw.ispan.smartorder.entity.embeddable;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

// menu_item_option_group 的複合主鍵；JPA 用 equals/hashCode 比對主鍵，所以要 @EqualsAndHashCode
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class MenuOptionEntity implements Serializable {
    private Long menuItemId;
    private Long optionGroupId;
}
