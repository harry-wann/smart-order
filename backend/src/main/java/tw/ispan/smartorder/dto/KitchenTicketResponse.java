package tw.ispan.smartorder.dto;

import java.time.LocalDateTime;
import java.util.List;

public record KitchenTicketResponse(
        Long orderId,
        Integer sequenceNo,
        LocalDateTime placedAt,
        String tableNo,
        List<KitchenItemResponse> items
) {
    public record KitchenItemResponse(
            Long id,
            String name,
            Integer quantity,
            String status,
            List<String> options,
            String note,
            // 出餐順序（04 §4.12）：1 鍋底、2 菜盤、3 火鍋料、4 肉品、5 主食、6 飲料甜點；
            // 鍋底品項固定 1，其他依所屬分類的 cook_order。items 已經照這個值排好
            Integer cookOrder
    ) {}
}
