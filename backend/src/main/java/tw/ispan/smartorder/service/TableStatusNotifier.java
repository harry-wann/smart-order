package tw.ispan.smartorder.service;

import java.time.LocalDateTime;
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

    public TableStatusNotifier(
            SimpMessagingTemplate messagingTemplate,
            DiningTableRepository diningTables,
            TableHoldService tableHoldService,
            PlatformTransactionManager transactionManager) {
        this.messagingTemplate = messagingTemplate;
        this.diningTables = diningTables;
        this.tableHoldService = tableHoldService;
        this.committedRead = new TransactionTemplate(transactionManager);
        this.committedRead.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
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
                    publish(tableId);
                }
            });
        } else {
            publish(tableId);
        }
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
