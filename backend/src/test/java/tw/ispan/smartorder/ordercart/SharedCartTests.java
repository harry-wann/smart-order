package tw.ispan.smartorder.ordercart;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.entity.*;
import tw.ispan.smartorder.ordercart.service.CartNotificationService;
import tw.ispan.smartorder.ordercart.service.OrderCartService;
import tw.ispan.smartorder.repository.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SharedCartTests {
    private final DiningSessionRepository sessions = mock(DiningSessionRepository.class);
    private final CartItemRepository carts = mock(CartItemRepository.class);
    private final CartItemOptionRepository options = mock(CartItemOptionRepository.class);
    private final DiningSessionGuestRepository guests = mock(DiningSessionGuestRepository.class);
    private final SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
    private final CartNotificationService notifications = new CartNotificationService(messaging, guests);
    private final OrderCartService service = new OrderCartService(sessions, carts, options, notifications);

    @AfterEach void cleanup() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        TransactionSynchronizationManager.setActualTransactionActive(false);
    }

    @Test void bothGuestsSeeTheWholeTableButCanOnlyEditTheirOwnItems() {
        var session = session();
        var first = item(1L, guest(97L));
        var second = item(2L, guest(98L));
        when(sessions.findById(50L)).thenReturn(Optional.of(session));
        when(carts.findByDiningSession_IdOrderByIdAsc(50L)).thenReturn(List.of(first, second));
        when(options.findByCartItem_Id(anyLong())).thenReturn(List.of());

        var cartA = service.getCart(50L, 97L);
        var cartB = service.getCart(50L, 98L);
        assertEquals(List.of(1L, 2L), cartA.items().stream().map(i -> i.id()).toList());
        assertEquals(List.of(1L, 2L), cartB.items().stream().map(i -> i.id()).toList());
        assertTrue(cartA.items().get(0).canEdit());
        assertFalse(cartA.items().get(1).canEdit());
        assertFalse(cartB.items().get(0).canEdit());
        assertTrue(cartB.items().get(1).canEdit());
        assertEquals(4, cartB.items().stream().mapToInt(i -> i.quantity()).sum());

        session.setStatus("PAID");
        assertTrue(service.getCart(50L, 97L).items().stream().noneMatch(i -> i.canEdit()));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void quantityAndDeleteNotifyBothGuestsOnlyAfterCommit(boolean delete) {
        when(sessions.findWithLockById(50L)).thenReturn(Optional.of(session()));
        when(carts.findByIdAndDiningSession_IdAndAddedByGuest_Id(1L, 50L, 97L))
                .thenReturn(Optional.of(item(1L, guest(97L))));
        when(guests.findByDiningSessionId(50L)).thenReturn(List.of(guest(97L), guest(98L)));
        beginTransaction();

        if (delete) service.deleteCartItem(50L, 1L, 97L);
        else service.updateQuantity(50L, 1L, 97L, 3);

        verifyNoInteractions(messaging);
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        var event = new CartNotificationService.CartUpdateMessage(50L, "CART_UPDATED");
        verify(messaging).convertAndSendToUser("guest-97", "/queue/cart-updates", event);
        verify(messaging).convertAndSendToUser("guest-98", "/queue/cart-updates", event);
        verifyNoMoreInteractions(messaging);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void anotherGuestsItemsCannotBeChangedOrDeleted(boolean delete) {
        when(sessions.findWithLockById(50L)).thenReturn(Optional.of(session()));
        when(carts.findByIdAndDiningSession_IdAndAddedByGuest_Id(1L, 50L, 98L))
                .thenReturn(Optional.empty());
        var error = assertThrows(ResponseStatusException.class, () -> {
            if (delete) service.deleteCartItem(50L, 1L, 98L);
            else service.updateQuantity(50L, 1L, 98L, 3);
        });
        assertEquals(403, error.getStatusCode().value());
        verify(carts, never()).save(any());
        verify(carts, never()).delete(any());
        verifyNoInteractions(options, messaging);
    }

    @Test void rolledBackCartUpdateDoesNotNotifyEitherGuest() {
        when(guests.findByDiningSessionId(50L)).thenReturn(List.of(guest(97L), guest(98L)));
        beginTransaction();
        notifications.notifyCartUpdatedAfterCommit(50L);
        TransactionSynchronizationManager.getSynchronizations().forEach(
                s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
        verifyNoInteractions(messaging);
    }

    private void beginTransaction() {
        TransactionSynchronizationManager.initSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(true);
    }

    private DiningSessionEntity session() {
        var table = new DiningTableEntity();
        table.setTableNo("A1");
        var session = new DiningSessionEntity();
        session.setId(50L);
        session.setDiningTable(table);
        return session;
    }

    private DiningSessionGuestEntity guest(Long id) {
        var guest = new DiningSessionGuestEntity();
        guest.setId(id);
        guest.setDiningSessionId(50L);
        guest.setDisplayName("客人 " + id);
        return guest;
    }

    private CartItemEntity item(Long id, DiningSessionGuestEntity owner) {
        var menu = new MenuItemEntity();
        menu.setName("牛肉");
        var item = new CartItemEntity();
        item.setId(id);
        item.setAddedByGuest(owner);
        item.setMenuItem(menu);
        item.setUnitPrice(new BigDecimal("100"));
        item.setQuantity(2);
        return item;
    }
}
