package tw.ispan.smartorder.ordercart.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class CartNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public CartNotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public record CartUpdateMessage(
            Long sessionId,
            String type
    ) {}

    // 交易成功後，通知客人
    public void notifyGuestAfterCommit(Long sessionId, Long guestId) {

        if (!TransactionSynchronizationManager.isActualTransactionActive() || !TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("購物車通知必須在交易中註冊");
        }

        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {

                    @Override
                    public void afterCommit() {
                        messagingTemplate.convertAndSendToUser(
                                "guest-" + guestId,
                                "/queue/cart-updates",
                                new CartUpdateMessage(sessionId, "CART_UPDATED")
                        );
                    }
                }
        );
    }
}