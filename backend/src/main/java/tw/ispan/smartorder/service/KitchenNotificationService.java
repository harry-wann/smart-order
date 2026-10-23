package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tw.ispan.smartorder.dto.KitchenTicketMessage;
import tw.ispan.smartorder.entity.DiningSessionGuestEntity;
import tw.ispan.smartorder.repository.DiningSessionGuestRepository;

import javax.sql.DataSource;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class KitchenNotificationService {

    private static final String KITCHEN_TOPIC = "/topic/kitchen";
    // 顧客端沿用購物車的個人 queue（WebSocketConfig 已允許已連線的客人訂閱），不另開 session 頻道。
    // 事件格式是 { type, payload, serverTime }，最外層沒有 sessionId，所以購物車頁不會把它當成購物車變動
    private static final String GUEST_QUEUE = "/queue/cart-updates";

    private final SimpMessagingTemplate messagingTemplate;
    private final JdbcTemplate jdbc;
    private final DiningSessionGuestRepository guests;

    public KitchenNotificationService(SimpMessagingTemplate messagingTemplate,
                                      @Qualifier("smartOrderDataSource") DataSource dataSource,
                                      DiningSessionGuestRepository guests) {
        this.messagingTemplate = messagingTemplate;
        this.jdbc = new JdbcTemplate(dataSource);
        this.guests = guests;
    }

    // OrderSubmitService 送出訂單後呼叫 KitchenNotificationService。交易成功提交後，
    // 通知服務透過 WebSocket 發送 NEW_TICKET，前端訂閱 /topic/kitchen 後收到通知並更新訂單。
    // 同桌客人另外會收到 CartNotificationService 的 ORDER_SUBMITTED，這裡只推廚房
    public void notifyNewTicketAfterCommit(Long ticketId) {
        notifyAfterCommit("NEW_TICKET", Map.of("ticketId", ticketId), List.of());
    }

    // 以下出餐、撤回、取消、報廢的事件，廚房和這張單所屬用餐場次的每位客人（C-08 出餐進度）都會收到

    // 這張單的品項全部出完（逐項勾完或整單出完），KDS 卡片淡出
    public void notifyTicketServedAfterCommit(Long ticketId) {
        notifyAfterCommit("TICKET_SERVED", Map.of("ticketId", ticketId), guestsOfTicket(ticketId));
    }

    public void notifyItemServedAfterCommit(Long ticketId, Long itemId) {
        notifyAfterCommit("ITEM_SERVED", Map.of(
                "ticketId", ticketId,
                "itemId", itemId,
                "servedAt", Instant.now()), guestsOfTicket(ticketId));
    }

    public void notifyItemUnservedAfterCommit(Long ticketId, Long itemId) {
        notifyAfterCommit("ITEM_UNSERVED", Map.of(
                "ticketId", ticketId,
                "itemId", itemId), guestsOfTicket(ticketId));
    }

    public void notifyItemCancelledAfterCommit(Long ticketId, Long itemId, String reason) {
        notifyAfterCommit("ITEM_CANCELLED", Map.of(
                "ticketId", ticketId,
                "itemId", itemId,
                "reason", reason), guestsOfTicket(ticketId));
    }

    public void notifyTicketCancelledAfterCommit(Long ticketId, String reason) {
        notifyAfterCommit("TICKET_CANCELLED", Map.of(
                "ticketId", ticketId,
                "reason", reason), guestsOfTicket(ticketId));
    }

    public void notifyItemWastedAfterCommit(Long ticketId, Long itemId, String reason) {
        notifyAfterCommit("ITEM_WASTED", Map.of(
                "ticketId", ticketId,
                "itemId", itemId,
                "reason", reason), guestsOfTicket(ticketId));
    }

    // 收件人在交易裡先查好（跟 CartNotificationService 一樣），提交後才推；交易 rollback 就什麼都不推
    private List<Long> guestsOfTicket(Long ticketId) {
        Long sessionId = jdbc.query("SELECT dining_session_id FROM order_ticket WHERE id = ?",
                rs -> rs.next() ? rs.getLong(1) : null, ticketId);
        if (sessionId == null) {
            return List.of();
        }
        return guests.findByDiningSessionId(sessionId).stream().map(DiningSessionGuestEntity::getId).toList();
    }

    private void notifyAfterCommit(String type, Object payload, List<Long> guestIds) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Kitchen notifications require an active transaction.");
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                KitchenTicketMessage message = new KitchenTicketMessage(type, payload, Instant.now());
                messagingTemplate.convertAndSend(KITCHEN_TOPIC, message);
                for (Long guestId : guestIds) {
                    messagingTemplate.convertAndSendToUser("guest-" + guestId, GUEST_QUEUE, message);
                }
            }
        });
    }
}
