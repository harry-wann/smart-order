package tw.ispan.smartorder.ordercart.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class CartNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final tw.ispan.smartorder.repository.DiningSessionGuestRepository guests;

    public CartNotificationService(SimpMessagingTemplate messagingTemplate,
            tw.ispan.smartorder.repository.DiningSessionGuestRepository guests) {
        this.messagingTemplate = messagingTemplate;
        this.guests = guests;
    }

    public record CartUpdateMessage(
            Long sessionId,
            String type
    ) {}

    public record TableActivity(String eventId, Long sessionId, String type, String actorDeviceId,
            String actorName, String itemName, int quantity, java.util.List<String> options,
            Integer sequenceNo, int itemCount, java.math.BigDecimal amount, String occurredAt,
            String byGuest, Long byGuestId) {}

    public void notifyTableAfterCommit(Long sessionId, Long guestId, String type, String itemName,
            int quantity, java.util.List<String> options, Integer sequenceNo, int itemCount,
            java.math.BigDecimal amount) {
        var actor = guests.findById(guestId).orElseThrow();
        var event = new TableActivity(java.util.UUID.randomUUID().toString(), sessionId, type,
                actor.getDeviceId(), actor.getDisplayName(), itemName, quantity, java.util.List.copyOf(options),
                sequenceNo, itemCount, amount, java.time.Instant.now().toString(), actor.getDisplayName(), guestId);
        notifyActivityAfterCommit(sessionId, event);
    }

    public void notifyStaffOrderAfterCommit(Long sessionId, int sequenceNo, int quantity,
            java.math.BigDecimal amount) {
        var event = new TableActivity(java.util.UUID.randomUUID().toString(), sessionId, "ORDER_SUBMITTED",
                null, "櫃檯", null, quantity, java.util.List.of(), sequenceNo, quantity,
                amount, java.time.Instant.now().toString(), "櫃檯", null);
        notifyActivityAfterCommit(sessionId, event);
    }

    private void notifyActivityAfterCommit(Long sessionId, TableActivity event) {
        var recipients = guests.findByDiningSessionId(sessionId).stream().map(g -> g.getId()).toList();
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("同桌通知必須在交易中註冊");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                for (Long recipient : recipients) {
                    messagingTemplate.convertAndSendToUser("guest-" + recipient, "/queue/cart-updates", event);
                }
            }
        });
    }

    // 交易成功後，通知整桌重新取得購物車。
    public void notifyCartUpdatedAfterCommit(Long sessionId) {

        if (!TransactionSynchronizationManager.isActualTransactionActive() || !TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("購物車通知必須在交易中註冊");
        }

        var recipients = guests.findByDiningSessionId(sessionId).stream().map(g -> g.getId()).toList();
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {

                    @Override
                    public void afterCommit() {
                        for (Long recipient : recipients) {
                            messagingTemplate.convertAndSendToUser(
                                    "guest-" + recipient,
                                    "/queue/cart-updates",
                                    new CartUpdateMessage(sessionId, "CART_UPDATED")
                            );
                        }
                    }
                }
        );
    }
}
