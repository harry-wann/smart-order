package tw.ispan.smartorder.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table( name = "menu_item_option_group")
@Getter
@Setter
public class MenuItemOptionGroupEntity {
    @EmbeddedId
    private Long menuItemId;
    private Long optionGroupId;
    private Integer sortOrder;
    private String createdAt;
    private String updateAt;
}
