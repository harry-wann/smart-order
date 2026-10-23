package tw.ispan.smartorder.service;

import jakarta.annotation.PreDestroy;
import java.time.LocalDateTime;
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
import tw.ispan.smartorder.entity.DiningTableEntity;
import tw.ispan.smartorder.repository.DiningTableRepository;
import tw.ispan.smartorder.reservation.dto.response.HeldForResponse;
import tw.ispan.smartorder.reservation.service.TableHoldService;

// TABLE_STATUS → /topic/counter。提交後重新讀桌況與保留，訊息才反映真正存下來的狀態。
@Service
public class TableStatusNotifier {

    private static final Logger log = LoggerFactory.getLogger(TableStatusNotifier.class);
    public static final String COUNTER_TOPIC = "/topic/counter";

    public record TableStatusMessage(
            String type,
            Long tableId,
            String tableNo,
            String status,
            String displayStatus,
            HeldForResponse heldFor
    ) {}

    private final SimpMessagingTemplate messagingTemplate;
    private final DiningTableRepository diningTables;
    private final TableHoldService tableHoldService;
    private final TransactionTemplate committedRead;
    // afterCommit 時請求的連線還沒歸還，在這裡再讀資料庫要第二條連線；同時 10 個以上操作就會把連線池用光、
    // 互等 30 秒。改由單一背景執行緒在請求還完連線後依提交順序推播。
    private final ExecutorService publisher = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "table-status-notifier");
        thread.setDaemon(true);
        return thread;
    });

    public TableStatusNotifier(
            SimpMessagingTemplate messagingTemplate,
            DiningTableRepository diningTables,
            TableHoldService tableHoldService,
            PlatformTransactionManager transactionManager) {
        this.messagingTemplate = messagingTemplate;
        this.diningTables = diningTables;
        this.tableHoldService = tableHoldService;
        this.committedRead = new TransactionTemplate(transactionManager);
        this.committedRead.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        this.committedRead.setReadOnly(true);
    }

    public void notifyAfterCommit(DiningTableEntity table) {
        notifyAfterCommit(table.getId());
    }

    public void notifyAfterCommit(Long tableId) {
        if (TransactionSynchronizationManager.isActualTransactionActive()
                && TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publishLater(tableId);
                }
            });
        } else {
            publishLater(tableId);
        }
    }

    // 資料已經提交；推播失敗只記 log，不能讓已完成的操作回 500，畫面由定時重抓補回
    private void publishLater(Long tableId) {
        try {
            publisher.execute(() -> {
                try {
                    publish(tableId);
                } catch (RuntimeException e) {
                    log.warn("桌況推播失敗，畫面會由定時重抓補回", e);
                }
            });
        } catch (RuntimeException e) {
            log.warn("桌況推播排入失敗，畫面會由定時重抓補回", e);
        }
    }

    @PreDestroy
    void shutdown() {
        publisher.shutdown();
    }

    private void publish(Long tableId) {
        TableStatusMessage message = committedRead.execute(ignored -> diningTables.findById(tableId)
                .map(table -> {
                    HeldForResponse heldFor = null;
                    if ("AVAILABLE".equals(table.getStatus())) {
                        heldFor = tableHoldService.toHeldFor(
                                tableHoldService.snapshot(LocalDateTime.now()).heldBy(tableId));
                    }
                    return new TableStatusMessage(
                            "TABLE_STATUS",
                            table.getId(),
                            table.getTableNo(),
                            table.getStatus(),
                            heldFor == null ? table.getStatus() : "RESERVED",
                            heldFor);
                })
                .orElse(null));
        if (message != null) {
            messagingTemplate.convertAndSend(COUNTER_TOPIC, message);
        }
    }
}
