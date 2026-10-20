package tw.ispan.smartorder.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class MenuStatusNotifier {
    private final SimpMessagingTemplate messaging;

    public MenuStatusNotifier(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    public record MenuStatusMessage(String type, Long menuItemId, boolean soldOut) {}
    public record MenuVisibilityMessage(String type, Long menuItemId) {}

    public void notifyVisibilityAfterCommit(Long itemId, boolean active) {
        publishAfterCommit(new MenuVisibilityMessage(active ? "MENU_LISTED" : "MENU_UNLISTED", itemId));
    }

    public void notifyAfterCommit(Long itemId, boolean soldOut) {
        var event = new MenuStatusMessage(soldOut ? "MENU_SOLD_OUT" : "MENU_AVAILABLE", itemId, soldOut);
        publishAfterCommit(event);
    }

    private void publishAfterCommit(Object event) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    messaging.convertAndSend("/topic/menu", event);
                }
            });
        } else {
            messaging.convertAndSend("/topic/menu", event);
        }
    }
}
