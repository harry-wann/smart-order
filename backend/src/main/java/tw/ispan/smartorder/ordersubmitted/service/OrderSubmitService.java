package tw.ispan.smartorder.ordersubmitted.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.entity.*;
import tw.ispan.smartorder.service.KitchenNotificationService;
import tw.ispan.smartorder.ordersubmitted.dto.OrderSubmittedResponse;
import tw.ispan.smartorder.repository.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import tw.ispan.smartorder.service.BillingCalculator;
import tw.ispan.smartorder.service.MenuStatusNotifier;
import tw.ispan.smartorder.service.OrderValidationService;

@Service
public class OrderSubmitService {
    @org.springframework.beans.factory.annotation.Autowired
    private tw.ispan.smartorder.ordercart.service.CartNotificationService notifications;
    @org.springframework.beans.factory.annotation.Autowired
    private KitchenNotificationService kitchenNotificationService;
    private final DiningSessionRepository sessionRepository;
    private final CartItemRepository cartItemRepository;
    private final CartItemOptionRepository cartItemOptionRepository;
    private final OrderTicketRepository ticketRepository;
    private final OrderItemRepository itemRepository;
    private final OrderItemOptionRepository optionRepository;
    private final InventoryRepository inventoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final OrderValidationService validationService;
    private final BillingCalculator billingCalculator;
    private final MenuStatusNotifier menuStatusNotifier;

    public OrderSubmitService(DiningSessionRepository sessionRepository,
                              CartItemRepository cartItemRepository,
                              CartItemOptionRepository cartItemOptionRepository,
                              OrderTicketRepository ticketRepository,
                              OrderItemRepository itemRepository,
                              OrderItemOptionRepository optionRepository,
                              InventoryRepository inventoryRepository,
                              MenuItemRepository menuItemRepository,
                              OrderValidationService validationService,
                              BillingCalculator billingCalculator,
                              MenuStatusNotifier menuStatusNotifier) {
        this.sessionRepository = sessionRepository;
        this.cartItemRepository = cartItemRepository;
        this.cartItemOptionRepository = cartItemOptionRepository;
        this.ticketRepository = ticketRepository;
        this.itemRepository = itemRepository;
        this.optionRepository = optionRepository;
        this.inventoryRepository = inventoryRepository;
        this.menuItemRepository = menuItemRepository;
        this.validationService = validationService;
        this.billingCalculator = billingCalculator;
        this.menuStatusNotifier = menuStatusNotifier;
    }

    @Transactional
    public OrderSubmittedResponse submitOrder(Long sessionId, Long guestId) {
        if (sessionId == null || guestId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "缺少用餐場次或客人身分");
        }

        // 所有同桌的送單、修改購物車都必須先取得同一筆 session 鎖。
        DiningSessionEntity session = lockOpenSession(sessionId);

        List<CartItemEntity> cartItems = cartItemRepository
                .findByDiningSession_IdAndAddedByGuest_IdOrderByIdAsc(sessionId, guestId);
        if (cartItems.isEmpty()) {
            throw ApiException.conflict("CART_EMPTY", "你的購物車沒有商品");
        }

        Map<Long, List<CartItemOptionEntity>> cartOptions = new HashMap<>();
        List<OrderValidationService.Selection> selections = new ArrayList<>();
        for (CartItemEntity cart : cartItems) {
            List<CartItemOptionEntity> selected = cartItemOptionRepository.findByCartItem_Id(cart.getId());
            cartOptions.put(cart.getId(), selected);
            selections.add(new OrderValidationService.Selection(cart.getMenuItem().getId(), cart.getQuantity(),
                    selected.stream().map(option -> option.getOptionValue().getId()).toList(), cart.getNote()));
        }
        CreatedOrder created = createOrder(session, guestId, "CUSTOMER", selections);
        session.increaseCartVersion();
        sessionRepository.save(session);

        // 只刪除當前 guest 的購物車，先刪選項再刪商品。
        for (CartItemEntity cart : cartItems) {
            cartItemOptionRepository.deleteAll(cartOptions.get(cart.getId()));
        }
        cartItemOptionRepository.flush();
        cartItemRepository.deleteAll(cartItems);
        cartItemRepository.flush();

        notifications.notifyTableAfterCommit(sessionId, guestId, "ORDER_SUBMITTED", null, created.quantity(),
                List.of(), created.sequenceNo(), created.quantity(), created.subtotal());
        return getOrder(created.ticketId(), sessionId);
    }

    @Transactional
    public OrderSubmittedResponse submitStaffOrder(Long sessionId, List<OrderValidationService.Selection> selections) {
        if (sessionId == null || sessionId <= 0) throw ApiException.badRequest("用餐場次編號不正確");
        DiningSessionEntity session = lockOpenSession(sessionId);
        CreatedOrder created = createOrder(session, null, "STAFF", selections);
        notifications.notifyStaffOrderAfterCommit(sessionId, created.sequenceNo(),
                created.quantity(), created.subtotal());
        return getOrder(created.ticketId(), sessionId);
    }

    private DiningSessionEntity lockOpenSession(Long sessionId) {
        DiningSessionEntity session = sessionRepository.findWithLockById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到用餐場次"));
        if (!"OPEN".equals(session.getStatus())) {
            throw ApiException.conflict("SESSION_CLOSED", "此桌已停止點餐");
        }
        return session;
    }

    private record CreatedOrder(Long ticketId, int sequenceNo, int quantity, BigDecimal subtotal) {}

    /** Caller holds the session lock before any menu or inventory lock. */
    private CreatedOrder createOrder(DiningSessionEntity session, Long guestId, String source,
                                     List<OrderValidationService.Selection> selections) {
        Long sessionId = session.getId();
        List<OrderValidationService.Line> lines = validationService.validate(sessionId, selections);
        Map<Long, Integer> stockNeeded = new TreeMap<>();
        Map<Long, String> itemNames = new HashMap<>();
        for (OrderValidationService.Line line : lines) {
            if (line.menu().trackInventory()) {
                stockNeeded.merge(line.menu().id(), line.selection().quantity(), Integer::sum);
                itemNames.put(line.menu().id(), line.menu().name());
            }
        }
        for (var entry : stockNeeded.entrySet()) {
            Long menuItemId = entry.getKey();
            if (inventoryRepository.decreaseIfEnough(menuItemId, entry.getValue()) != 1) {
                throw ApiException.conflict("ITEM_SOLD_OUT", itemNames.get(menuItemId) + " 已售完");
            }
            Integer remaining = inventoryRepository.currentQuantity(menuItemId);
            if (remaining != null && remaining == 0) {
                menuItemRepository.updateSoldOut(menuItemId, true);
                menuStatusNotifier.notifyAfterCommit(menuItemId, true);
            }
        }

        List<OrderTicketEntity> previousTickets = ticketRepository
                .findByDiningSessionIdOrderBySequenceNoDesc(sessionId);
        int nextSequence = previousTickets.stream()
                .map(OrderTicketEntity::getSequenceNo)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(0) + 1;

        OrderTicketEntity ticket = new OrderTicketEntity();
        ticket.setDiningSessionId(sessionId);
        ticket.setSubmittedByGuestId(guestId);
        ticket.setSequenceNo(nextSequence);
        ticket.setStatus("PENDING");
        ticket.setSource(source);
        ticket.setPlacedAt(LocalDateTime.now());
        ticket = ticketRepository.saveAndFlush(ticket);

        BigDecimal addedSubtotal = BigDecimal.ZERO;
        int quantitySum = 0;
        for (OrderValidationService.Line line : lines) {
            OrderValidationService.Selection selection = line.selection();
            int quantity = selection.quantity();
            quantitySum += quantity;
            BigDecimal optionsPrice = line.options().stream()
                    .map(option -> money(option.priceDelta()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal unitPrice = line.menu().price();
            BigDecimal lineTotal = unitPrice.add(optionsPrice)
                    .multiply(BigDecimal.valueOf(quantity));

            OrderItemEntity orderItem = new OrderItemEntity();
            orderItem.setOrderTicketId(ticket.getId());
            orderItem.setMenuItemId(line.menu().id());
            orderItem.setItemNameSnapshot(line.menu().name());
            orderItem.setUnitPriceSnapshot(unitPrice);
            orderItem.setOptionsPrice(optionsPrice);
            orderItem.setQuantity(quantity);
            orderItem.setNote(selection.note());
            orderItem.setStatus("PENDING");
            orderItem.setLineTotal(lineTotal);
            orderItem = itemRepository.saveAndFlush(orderItem);

            for (OrderValidationService.OptionSnapshot value : line.options()) {
                OrderItemOptionEntity orderOption = new OrderItemOptionEntity();
                orderOption.setOrderItemId(orderItem.getId());
                orderOption.setGroupNameSnapshot(value.groupName());
                orderOption.setValueNameSnapshot(value.valueName());
                orderOption.setPriceDelta(money(value.priceDelta()));
                optionRepository.save(orderOption);
            }
            addedSubtotal = addedSubtotal.add(lineTotal);
        }

        billingCalculator.recalculateAndStore(session);
        kitchenNotificationService.notifyNewTicketAfterCommit(ticket.getId());
        return new CreatedOrder(ticket.getId(), nextSequence, quantitySum, addedSubtotal);
    }

    @Transactional(readOnly = true)
    public OrderSubmittedResponse getOrder(Long orderTicketId, Long sessionId) {
        OrderTicketEntity ticket = ticketRepository.findById(orderTicketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到訂單"));
        if (!sessionId.equals(ticket.getDiningSessionId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到訂單");
        }
        List<OrderItemEntity> items = itemRepository
                .findByOrderTicketIdAndStatusNotOrderByIdAsc(orderTicketId, "CANCELLED");
        List<Long> ids = items.stream().map(OrderItemEntity::getId).toList();
        Map<Long, List<OrderItemOptionEntity>> optionMap = ids.isEmpty() ? Map.of()
                : optionRepository.findByOrderItemIdInOrderByIdAsc(ids).stream()
                .collect(Collectors.groupingBy(OrderItemOptionEntity::getOrderItemId));

        List<OrderSubmittedResponse.OrderItemResponse> resultItems = items.stream()
                .map(item -> new OrderSubmittedResponse.OrderItemResponse(
                        item.getId(), item.getItemNameSnapshot(), item.getQuantity(),
                        optionMap.getOrDefault(item.getId(), List.of()).stream()
                                .map(OrderItemOptionEntity::getValueNameSnapshot).toList(),
                        item.getNote(), item.getStatus()))
                .toList();
        return new OrderSubmittedResponse(ticket.getId(), ticket.getSequenceNo(),
                ticket.getStatus(), resultItems);
    }

    private BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
