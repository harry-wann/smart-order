package tw.ispan.smartorder.dto;

import tw.ispan.smartorder.dto.KitchenTicketResponse.KitchenItemResponse;

import java.time.LocalDateTime;
import java.util.List;

// 出菜看板「最近完成」分頁的一張單（GET /api/admin/kitchen/tickets/recent）。
// 欄位跟看板的 KitchenTicketResponse 一樣，品項也是同一個格式，另外多帶 completedAt：
// 這張單最後一道出餐品項的 served_at（算法見 KitchenTicketService.getRecentCompletedTickets）
public record KitchenCompletedTicketResponse(
        Long orderId,
        Integer sequenceNo,
        LocalDateTime placedAt,
        String tableNo,
        LocalDateTime completedAt,
        List<KitchenItemResponse> items
) {
    public static KitchenCompletedTicketResponse of(KitchenTicketResponse ticket, LocalDateTime completedAt) {
        return new KitchenCompletedTicketResponse(ticket.orderId(), ticket.sequenceNo(), ticket.placedAt(),
                ticket.tableNo(), completedAt, ticket.items());
    }
}
