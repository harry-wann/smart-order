package tw.ispan.smartorder.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class BillingNotifier {
    public record BillingMessage(String type, Long sessionId) {}

    private final SimpMessagingTemplate messaging;

    public BillingNotifier(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    public void notifyAfterCommit(Long sessionId) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("帳單通知必須在交易中註冊");
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messaging.convertAndSend("/topic/billing", new BillingMessage("BILL_UPDATED", sessionId));
            }
        });
    }
}
