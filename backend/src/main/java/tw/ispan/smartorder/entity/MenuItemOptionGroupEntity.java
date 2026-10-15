package tw.ispan.smartorder.entity;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tw.ispan.smartorder.entity.embeddable.MenuOptionEntity;

@Entity
@Table( name = "menu_item_option_group")
@Getter
@Setter
@NoArgsConstructor
public class MenuItemOptionGroupEntity {
    @EmbeddedId
    private MenuOptionEntity id;
    private Integer sortOrder;
    private String createdAt;
    private String updatedAt;
}
