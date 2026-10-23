package tw.ispan.smartorder.ordersubmitted.dto;

import java.util.List;

public record StaffOrderRequest(List<Item> items) {
    public record Item(Long menuItemId, Integer quantity, List<Long> optionValueIds, String note) {}
}
