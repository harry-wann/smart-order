package tw.ispan.smartorder.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tw.ispan.smartorder.dto.KitchenTicketMessage;

import java.time.Instant;
import java.util.Map;

@Service
public class KitchenNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public KitchenNotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // OrderSubmitService 送出訂單後呼叫 KitchenNotificationService。交易成功提交後，
    // 通知服務透過 WebSocket 發送 NEW_TICKET，前端訂閱 /topic/kitchen 後收到通知並更新訂單
    public void notifyNewTicketAfterCommit(Long ticketId) {
        notifyAfterCommit("NEW_TICKET", Map.of("ticketId", ticketId));
    }

    public void notifyTicketCompletedAfterCommit(Long ticketId) {
        notifyAfterCommit("TICKET_COMPLETED", Map.of("ticketId", ticketId));
    }

    public void notifyItemServedAfterCommit(Long ticketId, Long itemId) {
        notifyAfterCommit("ITEM_SERVED", Map.of(
                "ticketId", ticketId,
                "itemId", itemId,
                "servedAt", Instant.now()));
    }

    public void notifyItemUnservedAfterCommit(Long ticketId, Long itemId) {
        notifyAfterCommit("ITEM_UNSERVED", Map.of(
                "ticketId", ticketId,
                "itemId", itemId));
    }

    public void notifyTicketCancelledAfterCommit(Long ticketId, String reason) {
        notifyAfterCommit("TICKET_CANCELLED", Map.of(
                "ticketId", ticketId,
                "reason", reason));
    }

    private void notifyAfterCommit(String type, Object payload) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Kitchen notifications require an active transaction.");
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend(
                        "/topic/kitchen",
                        new KitchenTicketMessage(type, payload, Instant.now()));
            }
        });
    }
}
