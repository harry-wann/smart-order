package tw.ispan.smartorder.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import tw.ispan.smartorder.dto.KitchenTicketResponse;
import tw.ispan.smartorder.dto.CancelTicketRequest;
import tw.ispan.smartorder.service.KitchenTicketService;

import java.util.List;

// KitchenOverview 畫面
// WebSocket 事件類型 'NEW_TICKET', 'ITEM_SERVED', 'TICKET_COMPLETED', 'TICKET_CANCELLED'
@RestController
@RequestMapping("/api/admin")
public class KitchenTicketsController {
    private final KitchenTicketService kitchenTicketService;

    public KitchenTicketsController(KitchenTicketService kitchenTicketService) {
        this.kitchenTicketService = kitchenTicketService;
    }

    // 拿到訂單資料，只取 PENDING 或 PREPARING 的廚房訂單，並排除已取消品項
    @GetMapping("/kitchen/tickets")
    public List<KitchenTicketResponse> getKitchenTickets() {
        return kitchenTicketService.getKitchenTickets();
    }

    // 計算 24 小時內完成訂單數量
    @GetMapping("/kitchen/tickets/completed-count")
    public int getCompletedTicketCountLast24Hours() {
        return kitchenTicketService.getCompletedTicketCountLast24Hours();
    }

    // 把整張訂單狀態更新為 SERVED 隱藏 - webSocket 事件類型 TICKET_COMPLETED
    @PatchMapping("/kitchen/tickets/{ticketId}/complete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void completeTicket(@PathVariable Long ticketId) {
        kitchenTicketService.completeTicket(ticketId);
    }

    // 更新 order_item status - webSocket 事件類型 ITEM_SERVED
    @PatchMapping("/order-items/{itemId}/serve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void serveOrderItem(@PathVariable Long itemId) {
        kitchenTicketService.serveOrderItem(itemId);
    }

    @PatchMapping("/order-items/{itemId}/unserve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unserveOrderItem(@PathVariable Long itemId) {
        kitchenTicketService.unserveOrderItem(itemId);
    }

    // 取消訂單，把 order_ticket 的狀態改為 CANCELLED，從畫面中移除 - webSocket 事件類型 TICKET_CANCELLED
    @PatchMapping("/kitchen/tickets/{ticketId}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelTicket(@PathVariable Long ticketId, @RequestBody CancelTicketRequest request) {
        kitchenTicketService.cancelTicket(ticketId, request.cancelReason());
    }
}
