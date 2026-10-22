package tw.ispan.smartorder.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tw.ispan.smartorder.repository.CartItemOptionRepository;
import tw.ispan.smartorder.repository.CartItemRepository;
import tw.ispan.smartorder.repository.DiningSessionGuestRepository;

@Service
public class MenuCheckoutNotifier {
    private final SimpMessagingTemplate messaging;
    private final DiningSessionGuestRepository guests;
    private final CartItemRepository carts;
    private final CartItemOptionRepository options;

    public MenuCheckoutNotifier(SimpMessagingTemplate messaging, DiningSessionGuestRepository guests,
                                CartItemRepository carts, CartItemOptionRepository options) {
        this.messaging = messaging;
        this.guests = guests;
        this.carts = carts;
        this.options = options;
    }

    public record SessionClosedMessage(String type, Long sessionId, String reason) {}

    // 與結帳共用交易，捨棄全桌未送出的購物車；提交成功才通知每位顧客。
    public void completeAfterCommit(Long sessionId) {
        completeAfterCommit(sessionId, "PAID");
    }

    // Returns whether the cart changed, so the caller can advance cart_version in the same transaction.
    public boolean completeAfterCommit(Long sessionId, String reason) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("結帳通知必須在交易中註冊");
        }
        var recipients = guests.findByDiningSessionId(sessionId).stream().map(g -> g.getId()).toList();
        boolean clearedCart = false;
        for (Long guestId : recipients) {
            var items = carts.findByDiningSession_IdAndAddedByGuest_IdOrderByIdAsc(sessionId, guestId);
            if (!items.isEmpty()) clearedCart = true;
            for (var item : items) options.deleteByCartItem_Id(item.getId());
            options.flush();
            carts.deleteAll(items);
        }
        carts.flush();
        var event = new SessionClosedMessage("SESSION_CLOSED", sessionId, reason);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                for (Long guestId : recipients) {
                    messaging.convertAndSendToUser("guest-" + guestId, "/queue/cart-updates", event);
                }
                messaging.convertAndSend(TableStatusNotifier.COUNTER_TOPIC, event);
            }
        });
        return clearedCart;
    }
}
