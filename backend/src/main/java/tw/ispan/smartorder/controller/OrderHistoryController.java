package tw.ispan.smartorder.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.service.OrderHistoryService;

@RestController
@RequestMapping("/api/dining")
public class OrderHistoryController {
    private final OrderHistoryService orderHistoryService;

    public OrderHistoryController(OrderHistoryService orderHistoryService) {
        this.orderHistoryService = orderHistoryService;
    }

    @GetMapping("/orders")
    public OrderHistoryService.HistoryResponse getOrderHistory(
            @RequestAttribute("diningSessionId") long sessionId) {
        return orderHistoryService.getHistory(sessionId);
    }
}
