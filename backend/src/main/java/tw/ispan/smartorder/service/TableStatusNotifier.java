package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tw.ispan.smartorder.entity.DiningTableEntity;

// 桌況即時推播 TABLE_STATUS：桌子狀態變了，通知所有開著桌況頁的櫃檯
// 規格：04-API規格.md「TABLE_STATUS → /topic/counter」
@Service
public class TableStatusNotifier {

    public static final String COUNTER_TOPIC = "/topic/counter";

    // 推出去的內容；heldFor（預約保留）是 Harry的部分，這裡先給 null
    public record TableStatusMessage(
            String type,
            Long tableId,
            String tableNo,
            String status,
            String displayStatus,
            Object heldFor
    ) {}

    // Spring 內建的「廣播器」，跟購物車通知用的是同一個
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    // 桌子狀態改完之後呼叫；等交易真的存進資料庫（commit）才推
    public void notifyAfterCommit(DiningTableEntity table) {
        TableStatusMessage message = new TableStatusMessage(
                "TABLE_STATUS",
                table.getId(),
                table.getTableNo(),
                table.getStatus(),
                table.getStatus(),
                null);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    messagingTemplate.convertAndSend(COUNTER_TOPIC, message);
                }
            });
        } else {
            // 不在交易裡（理論上不會發生），就直接推
            messagingTemplate.convertAndSend(COUNTER_TOPIC, message);
        }
    }
}