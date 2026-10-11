package tw.ispan.smartorder.dto;

import java.math.BigDecimal;

public interface MenuItemOptionDetailRow {
    Long getMenuItemId();
    String getMenuItemName();
    String getDescription();
    String getImageUrl();
    BigDecimal getPrice();
    Long getOptionGroupId();
    String getOptionGroupName();
    Integer getMinSelect();
    Integer getMaxSelect();
    Long getOptionValueId();
    String getOptionValueName();
    BigDecimal getPriceDelta();
}
