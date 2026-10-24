package tw.ispan.smartorder.dto;

// 每個選項群組掛在幾個品項（GROUP BY 一次查回來的一列）
public interface OptionGroupMenuItemCountRow {
    Long getOptionGroupId();
    Long getMenuItemCount();
}
