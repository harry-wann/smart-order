package tw.ispan.smartorder.entity.embeddable;


import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class MenuOptionEntity implements Serializable {
    private Long menuItemId;
    private Long optionGroupId;
    public MenuOptionEntity() {
    }

    public MenuOptionEntity(Long menuItemId, Long optionGroupId) {
        this.menuItemId = menuItemId;
        this.optionGroupId = optionGroupId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MenuOptionEntity that)) return false;
        return Objects.equals(menuItemId, that.menuItemId)
                && Objects.equals(optionGroupId, that.optionGroupId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(menuItemId, optionGroupId);
    }
}
