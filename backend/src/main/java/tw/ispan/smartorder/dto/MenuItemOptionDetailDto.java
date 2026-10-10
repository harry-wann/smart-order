package tw.ispan.smartorder.dto;

import lombok.Getter;
import lombok.Setter;
import tw.ispan.smartorder.entity.MenuItemEntity;
import tw.ispan.smartorder.entity.OptionGroupEntity;
import tw.ispan.smartorder.entity.OptionValueEntity;

import java.util.List;

@Getter
@Setter
public class MenuItemOptionDetailDto {
    private MenuItemEntity menuItemId;
    private OptionGroupEntity optionGroupId;
    private OptionValueEntity option_group_id;

    public MenuItemOptionDetailDto(MenuItemEntity menuItemId, OptionGroupEntity optionGroupId, OptionValueEntity option_group_id) {
        this.menuItemId=menuItemId;
        this.optionGroupId = optionGroupId;
        this.option_group_id = option_group_id;
    }

    public record MenuItemDetailDto(
            MenuItemEntity menuItem,
            List<MenuItemOptionDetailDto> options
    ) {}
}
