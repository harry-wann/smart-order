package tw.ispan.smartorder.ordersubmitted.controller;

import tw.ispan.smartorder.ordersubmitted.dto.OrderSubmittedResponse;
import tw.ispan.smartorder.ordersubmitted.service.OrderSubmitService;

import org.springframework.web.bind.annotation.*;

// http://localhost:8080/api/order-tickets/2
@RestController
@RequestMapping("/api/order-tickets")
public class OrderSubmitController {

    private final OrderSubmitService orderSubmitService;

    public OrderSubmitController(
            OrderSubmitService orderSubmitService
    ) {
        this.orderSubmitService = orderSubmitService;
    }

    @GetMapping("/{id}")
    public OrderSubmittedResponse getOrder(
            @PathVariable Long id,
            @RequestAttribute("diningSessionId") Long sessionId
    ) {
        return orderSubmitService.getOrder(id, sessionId);
    }
}
