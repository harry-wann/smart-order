package tw.ispan.smartorder.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.dto.KitchenCompletedTicketResponse;
import tw.ispan.smartorder.dto.KitchenTicketResponse;
import tw.ispan.smartorder.dto.CancelTicketRequest;
import tw.ispan.smartorder.dto.WasteOrderItemRequest;
import tw.ispan.smartorder.service.KitchenTicketService;
import tw.ispan.smartorder.staff.security.StaffPrincipal;

import java.util.List;

// KitchenOverview 畫面
// WebSocket 事件類型 'NEW_TICKET', 'ITEM_SERVED', 'ITEM_UNSERVED', 'ITEM_CANCELLED', 'ITEM_WASTED', 'TICKET_SERVED', 'TICKET_CANCELLED'
// 除了 NEW_TICKET，其他事件也會推給該桌每位客人的個人 queue（C-08 出餐進度）
@RestController
@RequestMapping("/api/admin")
public class KitchenTicketsController {
    private final KitchenTicketService kitchenTicketService;

    public KitchenTicketsController(KitchenTicketService kitchenTicketService) {
        this.kitchenTicketService = kitchenTicketService;
    }

    // 拿到訂單資料，只取 PENDING 或 PREPARING 的廚房訂單，並排除已取消品項；
    // 同一張單內依分類的出餐順序排（04 §4.12）：鍋底 1、菜盤 2、火鍋料 3、肉品 4、主食 5、飲料甜點 6，
    // 鍋底品項固定 1（簡化說法：鍋底 → 菜盤 → 肉品）
    @GetMapping("/kitchen/tickets")
    public List<KitchenTicketResponse> getKitchenTickets() {
        return kitchenTicketService.getKitchenTickets();
    }

    // 「最近完成」分頁：最近 60 分鐘內完成（SERVED）的單，最新的在前、最多 50 張，只含用餐中（OPEN）的桌，
    // 每張多帶 completedAt（完成時間）。
    // 品項格式與單內順序跟 /kitchen/tickets 一樣；廚師在這裡取消勾選（unserve），誤勾完成的單就回到進行中
    @GetMapping("/kitchen/tickets/recent")
    public List<KitchenCompletedTicketResponse> getRecentCompletedTickets() {
        return kitchenTicketService.getRecentCompletedTickets();
    }

    // 計算 24 小時內完成訂單數量
    @GetMapping("/kitchen/tickets/completed-count")
    public int getCompletedTicketCountLast24Hours() {
        return kitchenTicketService.getCompletedTicketCountLast24Hours();
    }

    // 整單出完：把還沒出的品項全部標成已出餐，單由品項推導成 SERVED - webSocket 事件類型 TICKET_SERVED
    @PatchMapping("/kitchen/tickets/{ticketId}/complete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void completeTicket(@PathVariable Long ticketId) {
        kitchenTicketService.completeTicket(ticketId);
    }

    // 更新 order_item status - webSocket 事件類型 ITEM_SERVED（勾完最後一項再加 TICKET_SERVED）
    @PatchMapping("/order-items/{itemId}/serve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void serveOrderItem(@PathVariable Long itemId) {
        kitchenTicketService.serveOrderItem(itemId);
    }

    // 勾勾取消 - webSocket 事件類型 ITEM_UNSERVED；這桌已結帳或取消、而且這張單已完成（SERVED）時回 409 SESSION_CLOSED
    @PatchMapping("/order-items/{itemId}/unserve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unserveOrderItem(@PathVariable Long itemId) {
        kitchenTicketService.unserveOrderItem(itemId);
    }

    // 取消訂單細項 加入 order_item 取消理由 - webSocket 事件類型 ITEM_CANCELLED
    @PatchMapping("/order-items/{itemId}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelOrderItem(@PathVariable Long itemId, @RequestBody CancelTicketRequest request) {
        kitchenTicketService.cancelOrderItem(itemId, request.cancelReason());
    }

    // 報廢／退菜細項：記原因、庫存不回補、不計入帳單 - webSocket 事件類型 ITEM_WASTED
    @PatchMapping("/order-items/{itemId}/waste")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void wasteOrderItem(@PathVariable Long itemId, @RequestBody WasteOrderItemRequest request) {
        // 記下是哪位員工報廢的；SecurityConfig 已經要求廚房或店長登入，這裡拿不到只會是設定被改壞
        StaffPrincipal staff = StaffPrincipal.current();
        if (staff == null) {
            throw ApiException.unauthorized("請先登入");
        }
        kitchenTicketService.wasteOrderItem(itemId, request.reason(), staff.id());
    }

    // 取消訂單，把 order_ticket 的狀態改為 CANCELLED，從畫面中移除 - webSocket 事件類型 TICKET_CANCELLED
    @PatchMapping("/kitchen/tickets/{ticketId}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelTicket(@PathVariable Long ticketId, @RequestBody CancelTicketRequest request) {
        kitchenTicketService.cancelTicket(ticketId, request.cancelReason());
    }
}
