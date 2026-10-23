package tw.ispan.smartorder.ordersubmitted.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.ordersubmitted.dto.OrderSubmittedResponse;
import tw.ispan.smartorder.ordersubmitted.dto.StaffOrderRequest;
import tw.ispan.smartorder.ordersubmitted.service.OrderSubmitService;
import tw.ispan.smartorder.service.OrderValidationService;

@RestController
@RequestMapping("/api/admin/dining-sessions")
public class StaffOrderController {
    private final OrderSubmitService orderSubmitService;

    public StaffOrderController(OrderSubmitService orderSubmitService) {
        this.orderSubmitService = orderSubmitService;
    }

    @PostMapping("/{id}/orders")
    public ResponseEntity<OrderSubmittedResponse> create(@PathVariable Long id,
            @RequestBody(required = false) StaffOrderRequest request) {
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw ApiException.badRequest("請選擇至少一項商品");
        }
        List<OrderValidationService.Selection> selections = request.items().stream()
                .map(item -> item == null ? null : new OrderValidationService.Selection(
                        item.menuItemId(), item.quantity(), item.optionValueIds(), item.note()))
                .toList();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderSubmitService.submitStaffOrder(id, selections));
    }
}
