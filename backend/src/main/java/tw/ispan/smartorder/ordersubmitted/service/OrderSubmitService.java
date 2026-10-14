package tw.ispan.smartorder.ordersubmitted.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.entity.*;
import tw.ispan.smartorder.ordersubmitted.dto.OrderSubmittedResponse;
import tw.ispan.smartorder.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrderSubmitService {
    private final DiningSessionRepository sessionRepository;
    private final CartItemRepository cartItemRepository;
    private final CartItemOptionRepository cartItemOptionRepository;
    private final OrderTicketRepository ticketRepository;
    private final OrderItemRepository itemRepository;
    private final OrderItemOptionRepository optionRepository;

    public OrderSubmitService(DiningSessionRepository sessionRepository,
                              CartItemRepository cartItemRepository,
                              CartItemOptionRepository cartItemOptionRepository,
                              OrderTicketRepository ticketRepository,
                              OrderItemRepository itemRepository,
                              OrderItemOptionRepository optionRepository) {
        this.sessionRepository = sessionRepository;
        this.cartItemRepository = cartItemRepository;
        this.cartItemOptionRepository = cartItemOptionRepository;
        this.ticketRepository = ticketRepository;
        this.itemRepository = itemRepository;
        this.optionRepository = optionRepository;
    }

    @Transactional
    public OrderSubmittedResponse submitOrder(Long sessionId, Long guestId) {
        if (sessionId == null || guestId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "缺少用餐場次或客人身分");
        }

        // 所有同桌的送單、修改購物車都必須先取得同一筆 session 鎖。
        DiningSession session = sessionRepository.findWithLockById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到用餐場次"));
        if (!"OPEN".equals(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "此桌已停止點餐");
        }

        List<CartItem> cartItems = cartItemRepository
                .findByDiningSession_IdAndAddedByGuest_IdOrderByIdAsc(sessionId, guestId);
        if (cartItems.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "你的購物車沒有商品");
        }

        List<OrderTicket> previousTickets = ticketRepository
                .findByDiningSessionIdOrderBySequenceNoDesc(sessionId);
        int nextSequence = previousTickets.stream()
                .map(OrderTicket::getSequenceNo)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(0) + 1;

        OrderTicket ticket = new OrderTicket();
        ticket.setDiningSessionId(sessionId);
        ticket.setSubmittedByGuestId(guestId);
        ticket.setSequenceNo(nextSequence);
        ticket.setStatus("PENDING");
        ticket.setSource("CUSTOMER"); // 請與資料庫 source 欄位允許的值核對。
        ticket.setPlacedAt(LocalDateTime.now());
        ticket = ticketRepository.saveAndFlush(ticket);

        BigDecimal addedSubtotal = BigDecimal.ZERO;
        for (CartItem cart : cartItems) {
            int quantity = cart.getQuantity() == null ? 0 : cart.getQuantity();
            if (quantity <= 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "購物車商品數量不正確");
            }
            if (cart.getMenuItem() == null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "購物車商品不存在");
            }

            List<CartItemOption> cartOptions = cartItemOptionRepository.findByCartItem_Id(cart.getId());
            BigDecimal optionsPrice = cartOptions.stream()
                    .map(option -> money(option.getOptionValue().getPriceDelta()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal unitPrice = money(cart.getUnitPrice());
            BigDecimal lineTotal = unitPrice.add(optionsPrice)
                    .multiply(BigDecimal.valueOf(quantity));

            OrderItem orderItem = new OrderItem();
            orderItem.setOrderTicketId(ticket.getId());
            orderItem.setMenuItemId(cart.getMenuItem().getId());
            orderItem.setItemNameSnapshot(cart.getMenuItem().getName());
            orderItem.setUnitPriceSnapshot(unitPrice);
            orderItem.setOptionsPrice(optionsPrice);
            orderItem.setQuantity(quantity);
            orderItem.setNote(cart.getNote());
            orderItem.setStatus("PENDING");
            orderItem.setLineTotal(lineTotal);
            orderItem = itemRepository.saveAndFlush(orderItem);

            for (CartItemOption cartOption : cartOptions) {
                OptionValueEntity value = cartOption.getOptionValue();
                OrderItemOption orderOption = new OrderItemOption();
                orderOption.setOrderItemId(orderItem.getId());
                orderOption.setGroupNameSnapshot("");          // 目前 OptionValue 沒有選項群組關聯，先保留空字串。
                orderOption.setValueNameSnapshot(value.getName());
                orderOption.setPriceDelta(money(value.getPriceDelta()));
                optionRepository.save(orderOption);
            }
            addedSubtotal = addedSubtotal.add(lineTotal);
        }

        BigDecimal subtotal = money(session.getSubtotal()).add(addedSubtotal);
        BigDecimal serviceFee = subtotal.multiply(new BigDecimal("0.10"))
                .setScale(0, RoundingMode.HALF_UP);
        session.setSubtotal(subtotal);
        session.setServiceFee(serviceFee);
        session.setTotal(subtotal.add(serviceFee));
        session.increaseCartVersion();
        sessionRepository.save(session);

        // 只刪除當前 guest 的購物車，先刪選項再刪商品。
        for (CartItem cart : cartItems) {
            List<CartItemOption> cartOptions = cartItemOptionRepository.findByCartItem_Id(cart.getId());
            cartItemOptionRepository.deleteAll(cartOptions);
        }
        cartItemOptionRepository.flush();
        cartItemRepository.deleteAll(cartItems);
        cartItemRepository.flush();

        return getOrder(ticket.getId());
    }

    @Transactional(readOnly = true)
    public OrderSubmittedResponse getOrder(Long orderTicketId) {
        OrderTicket ticket = ticketRepository.findById(orderTicketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到訂單"));
        List<OrderItem> items = itemRepository
                .findByOrderTicketIdAndStatusNotOrderByIdAsc(orderTicketId, "CANCELLED");
        List<Long> ids = items.stream().map(OrderItem::getId).toList();
        Map<Long, List<OrderItemOption>> optionMap = ids.isEmpty() ? Map.of()
                : optionRepository.findByOrderItemIdInOrderByIdAsc(ids).stream()
                .collect(Collectors.groupingBy(OrderItemOption::getOrderItemId));

        List<OrderSubmittedResponse.OrderItemResponse> resultItems = items.stream()
                .map(item -> new OrderSubmittedResponse.OrderItemResponse(
                        item.getId(), item.getItemNameSnapshot(), item.getQuantity(),
                        optionMap.getOrDefault(item.getId(), List.of()).stream()
                                .map(OrderItemOption::getValueNameSnapshot).toList(),
                        item.getNote(), item.getStatus()))
                .toList();
        return new OrderSubmittedResponse(ticket.getId(), ticket.getSequenceNo(),
                ticket.getStatus(), resultItems);
    }

    private BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
