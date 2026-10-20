package tw.ispan.smartorder.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tw.ispan.smartorder.entity.CartItemEntity;
import tw.ispan.smartorder.entity.DiningSessionGuestEntity;
import tw.ispan.smartorder.repository.*;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class MenuCheckoutNotifierTests {
    @AfterEach void cleanup() {
        if (TransactionSynchronizationManager.isSynchronizationActive())
            TransactionSynchronizationManager.clearSynchronization();
        TransactionSynchronizationManager.setActualTransactionActive(false);
    }

    @Test void clearsWholeTableAndNotifiesOnlyAfterCommit() {
        var messaging = mock(SimpMessagingTemplate.class);
        var guests = mock(DiningSessionGuestRepository.class);
        var carts = mock(CartItemRepository.class);
        var options = mock(CartItemOptionRepository.class);
        var notifier = new MenuCheckoutNotifier(messaging, guests, carts, options);
        var first = new DiningSessionGuestEntity(); first.setId(1L);
        var second = new DiningSessionGuestEntity(); second.setId(2L);
        var item = new CartItemEntity(); item.setId(3L);
        when(guests.findByDiningSessionId(10L)).thenReturn(List.of(first, second));
        when(carts.findByDiningSession_IdAndAddedByGuest_IdOrderByIdAsc(10L, 1L)).thenReturn(List.of(item));
        when(carts.findByDiningSession_IdAndAddedByGuest_IdOrderByIdAsc(10L, 2L)).thenReturn(List.of());
        assertThrows(IllegalStateException.class, () -> notifier.completeAfterCommit(10L));
        TransactionSynchronizationManager.setActualTransactionActive(true);
        TransactionSynchronizationManager.initSynchronization();
        notifier.completeAfterCommit(10L);
        verify(options).deleteByCartItem_Id(3L);
        verify(carts).deleteAll(List.of(item));
        verifyNoInteractions(messaging);
        TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCommit());
        var event = new MenuCheckoutNotifier.SessionClosedMessage("SESSION_CLOSED", 10L, "PAID");
        verify(messaging).convertAndSendToUser("guest-1", "/queue/cart-updates", event);
        verify(messaging).convertAndSendToUser("guest-2", "/queue/cart-updates", event);
    }
}
