package tw.ispan.smartorder.ordercart.controller;

import tw.ispan.smartorder.ordercart.dto.CartResponse;
import tw.ispan.smartorder.ordercart.service.OrderCartService;
import tw.ispan.smartorder.ordercart.service.CurrentGuestService;
import tw.ispan.smartorder.ordersubmitted.dto.OrderSubmittedResponse;
import tw.ispan.smartorder.ordersubmitted.service.OrderSubmitService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dining-sessions")
public class OrderCartController {

    private final OrderCartService orderCartService;
    private final CurrentGuestService currentGuestService;
    private final OrderSubmitService orderSubmitService;
    public OrderCartController(
            OrderCartService orderCartService,
            CurrentGuestService currentGuestService,
            OrderSubmitService orderSubmitService
    ) {
        this.orderCartService = orderCartService;
        this.currentGuestService = currentGuestService;
        this.orderSubmitService = orderSubmitService;
    }

    public record QuantityRequest(int quantity) {}

    @PostMapping("/{sessionId}/cart/items")
    @ResponseStatus(HttpStatus.CREATED)
    public void addItem(@PathVariable Long sessionId, @RequestBody OrderCartService.AddItemRequest request) {
        orderCartService.addItem(sessionId, currentGuestService.requireGuestId(sessionId), request);
    }

    // 查詢整桌購物車，依本人身分標示可編輯的商品。
    @GetMapping("/{sessionId}/cart")
    public CartResponse getCart(@PathVariable Long sessionId) {
        Long guestId = currentGuestService.requireGuestId(sessionId);
        return orderCartService.getCart(sessionId, guestId);
    }

    // 修改自己的商品數量
    @PatchMapping("/{sessionId}/cart/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateQuantity(
            @PathVariable Long sessionId,
            @PathVariable Long itemId,
            @RequestBody QuantityRequest request
    ) {
        Long guestId = currentGuestService.requireGuestId(sessionId);
        orderCartService.updateQuantity(
                sessionId, itemId, guestId, request.quantity()
        );
    }

    // 刪除自己的商品
    @DeleteMapping("/{sessionId}/cart/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCartItem(
            @PathVariable Long sessionId,
            @PathVariable Long itemId
    ) {
        Long guestId = currentGuestService.requireGuestId(sessionId);

        orderCartService.deleteCartItem(
                sessionId, itemId, guestId
        );
    }
    // 送出自己的餐點
    @PostMapping("/{sessionId}/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderSubmittedResponse submitOrder(
            @PathVariable Long sessionId
    ) {
        Long guestId = currentGuestService.requireGuestId(sessionId);
        return orderSubmitService.submitOrder(sessionId, guestId);
    }
}
