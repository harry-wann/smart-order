package tw.ispan.smartorder.kitchen.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tw.ispan.smartorder.kitchen.dto.KitchenTicketMessage;

@Service
public class KitchenNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public KitchenNotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void notifyNewTicketAfterCommit(Long ticketId) {
        notifyAfterCommit("NEW_TICKET", ticketId);
    }

    public void notifyTicketCompletedAfterCommit(Long ticketId) {
        notifyAfterCommit("TICKET_COMPLETED", ticketId);
    }

    private void notifyAfterCommit(String type, Long ticketId) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Kitchen notifications require an active transaction.");
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messagingTemplate.convertAndSend(
                        "/topic/kitchen",
                        new KitchenTicketMessage(type, ticketId));
            }
        });
    }
}
