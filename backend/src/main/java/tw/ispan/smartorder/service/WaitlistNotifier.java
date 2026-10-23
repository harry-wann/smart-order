package tw.ispan.smartorder.service;

import jakarta.annotation.PreDestroy;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import tw.ispan.smartorder.repository.WaitlistRepository;

@Service
public class WaitlistNotifier {
    private static final Logger log = LoggerFactory.getLogger(WaitlistNotifier.class);
    private static final String WAITLIST_TOPIC = "/topic/waitlist";
    private static final String COUNTER_TOPIC = "/topic/counter";

    public record Event<T>(String type, T payload) { }
    public record Called(String ticketNo, Integer partySize) { }
    public record Updated(long waitingCount) { }

    private final SimpMessagingTemplate messaging;
    private final WaitlistRepository waitlists;
    private final TransactionTemplate committedRead;
    // afterCommit still holds the request's DB connection. Reading the waiting count there needs a
    // second one, so 10+ concurrent writes exhausted the pool and waited 30s. One background thread
    // publishes after the request returns its connection, in commit order.
    private final ExecutorService publisher = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "waitlist-notifier");
        thread.setDaemon(true);
        return thread;
    });

    public WaitlistNotifier(SimpMessagingTemplate messaging, WaitlistRepository waitlists,
                            PlatformTransactionManager transactionManager) {
        this.messaging = messaging;
        this.waitlists = waitlists;
        this.committedRead = new TransactionTemplate(transactionManager);
        this.committedRead.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        this.committedRead.setReadOnly(true);
    }

    public void notifyCalledAfterCommit(String ticketNo, Integer partySize) {
        afterCommit(() -> messaging.convertAndSend(WAITLIST_TOPIC,
                new Event<>("WAITLIST_CALLED", new Called(ticketNo, partySize))));
    }

    public void notifyUpdatedAfterCommit() {
        afterCommit(() -> {
            long waitingCount = committedRead.execute(ignored -> waitlists.countByStatus("WAITING"));
            Event<Updated> event = new Event<>("WAITLIST_UPDATED", new Updated(waitingCount));
            messaging.convertAndSend(WAITLIST_TOPIC, event);
            messaging.convertAndSend(COUNTER_TOPIC, event);
        });
    }

    private void afterCommit(Runnable publish) {
        if (TransactionSynchronizationManager.isActualTransactionActive()
                && TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publishLater(publish);
                }
            });
        } else {
            publishLater(publish);
        }
    }

    // The change is already committed here. A failed push must not turn the API response into 500,
    // otherwise staff retry and create a duplicate ticket; pages recover by polling.
    private void publishLater(Runnable publish) {
        try {
            publisher.execute(() -> {
                try {
                    publish.run();
                } catch (RuntimeException e) {
                    log.warn("候位推播失敗，畫面會由定時重抓補回", e);
                }
            });
        } catch (RuntimeException e) {
            log.warn("候位推播排入失敗，畫面會由定時重抓補回", e);
        }
    }

    @PreDestroy
    void shutdown() {
        publisher.shutdown();
    }
}
