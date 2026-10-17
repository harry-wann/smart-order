package tw.ispan.smartorder.ordercart;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.entity.*;
import tw.ispan.smartorder.ordercart.service.*;
import tw.ispan.smartorder.ordersubmitted.service.OrderSubmitService;
import tw.ispan.smartorder.repository.*;
import tw.ispan.smartorder.util.JwtToken;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TableActivityTests {
    @AfterEach void cleanup() {
        RequestContextHolder.resetRequestAttributes();
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        TransactionSynchronizationManager.setActualTransactionActive(false);
    }

    @Test void eachPhoneHasItsOwnIdentityAndToken() {
        String first = JwtToken.createGuestToken(50L, 97L, "phone-a");
        String second = JwtToken.createGuestToken(50L, 98L, "phone-b");
        assertNotEquals(first, second);
        assertEquals(97L, JwtToken.parseGuestToken(first, "phone-a").guestId());
        assertEquals(98L, JwtToken.parseGuestToken(second, "phone-b").guestId());
        assertThrows(IllegalArgumentException.class, () -> JwtToken.parseGuestToken(first, "phone-b"));
        assertThrows(IllegalArgumentException.class,
                () -> JwtToken.parseGuestToken(JwtToken.createToken("50"), "phone-a"));
    }

    @Test void currentGuestMustMatchSessionDeviceAndSignedGuest() {
        var guests = mock(DiningSessionGuestRepository.class);
        var guest = guest(98L, "phone-b", "小王");
        when(guests.findByDiningSessionIdAndDeviceId(50L, "phone-b")).thenReturn(Optional.of(guest));
        var request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "phone-b");
        request.setAttribute("diningSessionId", 50L);
        request.setAttribute("diningGuestId", 98L);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        var service = new CurrentGuestServiceImpl(guests);
        assertEquals(98L, service.requireGuestId(50L));
        assertThrows(ResponseStatusException.class, () -> service.requireGuestId(51L));
        request.setAttribute("diningGuestId", 97L);
        assertThrows(ResponseStatusException.class, () -> service.requireGuestId(50L));
    }

    @Test void notificationWaitsForCommitAndOnlyTargetsGuestsAtThisTable() {
        var messaging = mock(SimpMessagingTemplate.class);
        var guests = mock(DiningSessionGuestRepository.class);
        var actor = guest(97L, "phone-a", "小美");
        when(guests.findById(97L)).thenReturn(Optional.of(actor));
        when(guests.findByDiningSessionId(50L)).thenReturn(List.of(actor, guest(98L, "phone-b", "小王")));
        TransactionSynchronizationManager.initSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(true);
        var service = new CartNotificationService(messaging, guests);
        service.notifyTableAfterCommit(50L, 97L, "ITEM_ADDED", "牛肉", 2, List.of("全份"), null, 1, null);
        verifyNoInteractions(messaging);
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        var event = org.mockito.ArgumentCaptor.forClass(CartNotificationService.TableActivity.class);
        verify(messaging).convertAndSendToUser(eq("guest-98"), eq("/queue/cart-updates"), event.capture());
        assertEquals("小美", event.getValue().actorName());
        assertEquals("phone-a", event.getValue().actorDeviceId());
        assertEquals(2, event.getValue().quantity());
        verify(messaging).convertAndSendToUser(eq("guest-97"), eq("/queue/cart-updates"), any(Object.class));
        verifyNoMoreInteractions(messaging);
    }

    @Test void rolledBackChangesDoNotSendNotifications() {
        var messaging = mock(SimpMessagingTemplate.class);
        var guests = mock(DiningSessionGuestRepository.class);
        var actor = guest(97L, "phone-a", "小美");
        when(guests.findById(97L)).thenReturn(Optional.of(actor));
        when(guests.findByDiningSessionId(50L)).thenReturn(List.of(actor));
        TransactionSynchronizationManager.initSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(true);
        new CartNotificationService(messaging, guests).notifyTableAfterCommit(
                50L, 97L, "ITEM_ADDED", "牛肉", 2, List.of(), null, 1, null);
        TransactionSynchronizationManager.getSynchronizations().forEach(
                s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
        verifyNoInteractions(messaging);
    }

    @Test void orderNotificationUsesOnlySubmittedItemsIncludingOptionsAndQuantity() {
        var sessions = mock(DiningSessionRepository.class);
        var carts = mock(CartItemRepository.class);
        var cartOptions = mock(CartItemOptionRepository.class);
        var tickets = mock(OrderTicketRepository.class);
        var items = mock(OrderItemRepository.class);
        var options = mock(OrderItemOptionRepository.class);
        var notifications = mock(CartNotificationService.class);
        var session = new DiningSessionEntity();
        session.setId(50L);
        session.setSubtotal(new BigDecimal("1000"));
        var menu = new MenuItemEntity(); menu.setId(1L); menu.setName("牛肉");
        var cart = new CartItemEntity(); cart.setId(1L); cart.setMenuItem(menu);
        cart.setQuantity(2); cart.setUnitPrice(new BigDecimal("100"));
        var value = new OptionValueEntity(); value.setName("加量"); value.setPriceDelta(new BigDecimal("20"));
        var option = new CartItemOptionEntity(); option.setOptionValue(value);
        when(sessions.findWithLockById(50L)).thenReturn(Optional.of(session));
        when(carts.findByDiningSession_IdAndAddedByGuest_IdOrderByIdAsc(50L, 98L)).thenReturn(List.of(cart));
        when(cartOptions.findByCartItem_Id(1L)).thenReturn(List.of(option));
        when(tickets.findByDiningSessionIdOrderBySequenceNoDesc(50L)).thenReturn(List.of());
        when(tickets.saveAndFlush(any())).thenAnswer(invocation -> {
            OrderTicketEntity ticket = invocation.getArgument(0); ticket.setId(8L); return ticket;
        });
        when(tickets.findById(8L)).thenAnswer(invocation -> {
            var ticket = new OrderTicketEntity(); ticket.setId(8L); return Optional.of(ticket);
        });
        when(items.saveAndFlush(any())).thenAnswer(invocation -> {
            OrderItemEntity item = invocation.getArgument(0); item.setId(9L); return item;
        });
        when(items.findByOrderTicketIdAndStatusNotOrderByIdAsc(8L, "CANCELLED")).thenReturn(List.of());
        var service = new OrderSubmitService(sessions, carts, cartOptions, tickets, items, options);
        ReflectionTestUtils.setField(service, "notifications", notifications);
        service.submitOrder(50L, 98L);
        // 一筆餐點 × 2 份，加價 20：本次 240，不含既有 1000 與服務費。
        verify(notifications).notifyTableAfterCommit(50L, 98L, "ORDER_SUBMITTED", null, 0,
                List.of(), 1, 1, new BigDecimal("240"));
        assertEquals(new BigDecimal("1240"), session.getSubtotal());
    }

    private DiningSessionGuestEntity guest(Long id, String device, String name) {
        var guest = new DiningSessionGuestEntity(); guest.setId(id); guest.setDiningSessionId(50L);
        guest.setDeviceId(device); guest.setDisplayName(name); return guest;
    }

    @Test void socketAuthenticatesGuestAndRejectsDirectQueueSubscriptions() {
        var guests = mock(DiningSessionGuestRepository.class);
        var sessions = mock(DiningSessionRepository.class);
        var registration = mock(org.springframework.messaging.simp.config.ChannelRegistration.class);
        new tw.ispan.smartorder.config.WebSocketConfig(guests, sessions).configureClientInboundChannel(registration);
        var captured = org.mockito.ArgumentCaptor.forClass(org.springframework.messaging.support.ChannelInterceptor.class);
        verify(registration).interceptors(captured.capture());
        var interceptor = captured.getValue();
        var guest = guest(98L, "phone-b", "小王");
        var session = new DiningSessionEntity();
        when(guests.findByDiningSessionIdAndDeviceId(50L, "phone-b")).thenReturn(Optional.of(guest));
        when(sessions.findById(50L)).thenReturn(Optional.of(session));
        var connect = org.springframework.messaging.simp.stomp.StompHeaderAccessor.create(
                org.springframework.messaging.simp.stomp.StompCommand.CONNECT);
        connect.setNativeHeader("X-Session-Token", JwtToken.createGuestToken(50L, 98L, "phone-b"));
        connect.setNativeHeader("X-Device-Id", "phone-b");
        connect.setLeaveMutable(true);
        var channel = mock(org.springframework.messaging.MessageChannel.class);
        interceptor.preSend(org.springframework.messaging.support.MessageBuilder.createMessage(
                new byte[0], connect.getMessageHeaders()), channel);
        assertEquals("guest-98", connect.getUser().getName());
        var subscribe = org.springframework.messaging.simp.stomp.StompHeaderAccessor.create(
                org.springframework.messaging.simp.stomp.StompCommand.SUBSCRIBE);
        subscribe.setUser(connect.getUser());
        subscribe.setDestination("/queue/cart-updates-other-user");
        subscribe.setLeaveMutable(true);
        assertThrows(IllegalArgumentException.class, () -> interceptor.preSend(
                org.springframework.messaging.support.MessageBuilder.createMessage(
                        new byte[0], subscribe.getMessageHeaders()), channel));
        subscribe.setDestination("/user/queue/cart-updates");
        assertNotNull(interceptor.preSend(org.springframework.messaging.support.MessageBuilder.createMessage(
                new byte[0], subscribe.getMessageHeaders()), channel));
    }

    @Test void addItemUsesDatabasePriceAndRejectsOptionsFromOtherProducts() {
        var sessions = mock(DiningSessionRepository.class);
        var carts = mock(CartItemRepository.class);
        var cartOptions = mock(CartItemOptionRepository.class);
        var notifications = mock(CartNotificationService.class);
        var menus = mock(MenuItemRepository.class);
        var values = mock(OptionValueRepository.class);
        var itemGroups = mock(MenuItemOptionGroupRepository.class);
        var groups = mock(OptionGroupRepository.class);
        var guests = mock(DiningSessionGuestRepository.class);
        var service = new OrderCartService(sessions, carts, cartOptions, notifications);
        ReflectionTestUtils.setField(service, "menuItems", menus);
        ReflectionTestUtils.setField(service, "optionValues", values);
        ReflectionTestUtils.setField(service, "itemGroups", itemGroups);
        ReflectionTestUtils.setField(service, "groups", groups);
        ReflectionTestUtils.setField(service, "guests", guests);
        var session = new DiningSessionEntity(); session.setId(50L);
        var menu = new MenuItemEntity(); menu.setId(1L); menu.setName("白飯");
        menu.setActive(true); menu.setPrice(new BigDecimal("30"));
        when(sessions.findWithLockById(50L)).thenReturn(Optional.of(session));
        when(guests.findById(98L)).thenReturn(Optional.of(guest(98L, "phone-b", "小王")));
        when(menus.findById(1L)).thenReturn(Optional.of(menu));
        var otherGroup = new OptionGroupEntity(); otherGroup.setId(99L);
        var invalid = new OptionValueEntity(); invalid.setActive(true); invalid.setOptionGroupId(otherGroup);
        when(values.findAllById(List.of(7L))).thenReturn(List.of(invalid));
        when(itemGroups.findById_MenuItemId(1L)).thenReturn(List.of());
        assertThrows(ResponseStatusException.class, () -> service.addItem(50L, 98L,
                new OrderCartService.AddItemRequest(1L, 2, List.of(7L), null)));
        verifyNoInteractions(carts, notifications);
        when(values.findAllById(List.of())).thenReturn(List.of());
        when(groups.findAllById(List.of())).thenReturn(List.of());
        service.addItem(50L, 98L, new OrderCartService.AddItemRequest(1L, 2, List.of(), null));
        var saved = org.mockito.ArgumentCaptor.forClass(CartItemEntity.class);
        verify(carts).saveAndFlush(saved.capture());
        assertEquals(98L, saved.getValue().getAddedByGuest().getId());
        assertEquals(new BigDecimal("30"), saved.getValue().getUnitPrice());
        assertEquals(2, saved.getValue().getQuantity());
        verify(notifications).notifyTableAfterCommit(50L, 98L, "ITEM_ADDED", "白飯", 2, List.of(), null, 1, null);
    }
}
