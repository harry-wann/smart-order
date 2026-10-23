package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.dto.KitchenTicketResponse;
import tw.ispan.smartorder.dto.KitchenTicketResponse.KitchenItemResponse;
import tw.ispan.smartorder.entity.DiningSessionEntity;
import tw.ispan.smartorder.repository.DiningSessionRepository;

import javax.sql.DataSource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// 出菜看板（S-04）的查詢與出餐操作。
//
// 單的狀態只由品項推導（M4 4.5）：每次品項出餐、撤回、報廢後都交給 OrderTicketStatusUpdater 重算一次，
// 不能手動把單設成 SERVED；取消品項（OrderCancellationService）也用同一份推導。
//
// 鎖的順序跟送單（OrderSubmitService）、取消（OrderCancellationService）一致，都是先鎖 dining_session 那一列：
//   dining_session → order_ticket → order_item
// 同一桌所有會改到 order_ticket／order_item 的交易都先排在同一把 session 鎖後面，
// 兩個廚師同時勾同一張單的不同品項、或廚房勾選時櫃檯剛好取消，都會一個做完另一個才開始，不會死結也不會互相蓋掉。
// 鎖完 session 之後的讀取都要看到別人剛提交的資料，所以交易用 READ_COMMITTED（MySQL 預設的 REPEATABLE READ
// 會沿用第一次讀取時的快照，鎖拿到了讀的卻是舊資料）。
@Service
public class KitchenTicketService {

    // 4.7 出餐順序：同一張單內鍋底最前、其次菜盤、最後肉品。
    //   鍋底 = menu_item.is_soup_base = 1
    //   肉品 = 品項所屬分類的名稱是「肉品」
    //   菜盤 = 其他全部（蔬菜、火鍋料、海鮮、主食、飲料…）
    // 同一級裡照點餐順序（order_item.id）
    // 已知限制：肉品是依分類名稱「肉品」判斷，資料表沒有「這是肉品」的欄位。
    // 店長在菜單管理把分類改名（例如改成「肉類」）後，肉品會被排到菜盤那一級，要跟著改這裡的名稱
    private static final String MEAT_CATEGORY_NAME = "肉品";
    private static final int MAX_REASON_LENGTH = 100;

    private final JdbcTemplate jdbc;
    private final KitchenNotificationService kitchenNotificationService;
    private final OrderCancellationService cancellationService;
    private final DiningSessionRepository sessions;
    private final PendingPaymentGuard pendingPaymentGuard;
    private final BillingCalculator billing;
    private final OrderTicketStatusUpdater ticketStatus;

    public KitchenTicketService(@Qualifier("smartOrderDataSource") DataSource dataSource,
                                KitchenNotificationService kitchenNotificationService,
                                OrderCancellationService cancellationService,
                                DiningSessionRepository sessions,
                                PendingPaymentGuard pendingPaymentGuard,
                                BillingCalculator billing,
                                OrderTicketStatusUpdater ticketStatus) {
        this.jdbc = new JdbcTemplate(dataSource);
        this.kitchenNotificationService = kitchenNotificationService;
        this.cancellationService = cancellationService;
        this.sessions = sessions;
        this.pendingPaymentGuard = pendingPaymentGuard;
        this.billing = billing;
        this.ticketStatus = ticketStatus;
    }

    public List<KitchenTicketResponse> getKitchenTickets() {
        List<TicketRow> rows = jdbc.query("""
                SELECT ot.id AS order_id,
                       ot.sequence_no,
                       ot.placed_at,
                       dt.table_no,
                       oi.id AS item_id,
                       oi.item_name_snapshot,
                       oi.quantity,
                       oi.status AS item_status,
                       oi.note,
                       oio.value_name_snapshot,
                       CASE
                           WHEN mi.is_soup_base = 1 THEN 0
                           WHEN mc.name = ? THEN 2
                           ELSE 1
                       END AS serve_rank
                FROM order_ticket ot
                JOIN dining_session ds ON ds.id = ot.dining_session_id
                JOIN dining_table dt ON dt.id = ds.table_id
                JOIN order_item oi ON oi.order_ticket_id = ot.id
                LEFT JOIN menu_item mi ON mi.id = oi.menu_item_id
                LEFT JOIN menu_category mc ON mc.id = mi.category_id
                LEFT JOIN order_item_option oio ON oio.order_item_id = oi.id
                WHERE ot.status IN ('PENDING', 'PREPARING')
                  AND oi.status <> 'CANCELLED'
                ORDER BY ot.placed_at ASC, ot.id ASC, serve_rank ASC, oi.id ASC, oio.id ASC
                """, (rs, rowNum) -> mapRow(rs), MEAT_CATEGORY_NAME);

        Map<Long, TicketBuilder> tickets = new LinkedHashMap<>();
        for (TicketRow row : rows) {
            TicketBuilder ticket = tickets.computeIfAbsent(row.orderId(), id -> new TicketBuilder(
                    row.orderId(), row.sequenceNo(), row.placedAt(), row.tableNo()));
            ItemBuilder item = ticket.items.computeIfAbsent(row.itemId(), id -> new ItemBuilder(
                    row.itemId(), row.itemName(), row.quantity(), row.itemStatus(), row.note()));
            if (row.optionName() != null) {
                item.options.add(row.optionName());
            }
        }

        return tickets.values().stream().map(TicketBuilder::toResponse).toList();
    }

    public int getCompletedTicketCountLast24Hours() {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM order_ticket
                WHERE status = 'SERVED'
                  AND updated_at >= CURRENT_TIMESTAMP(3) - INTERVAL 1 DAY
                """, Integer.class);
        return count == null ? 0 : count;
    }

    // 勾選單一品項已出餐；勾完最後一項，這張單自動變 SERVED
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void serveOrderItem(Long itemId) {
        LockedItem item = lockItem(itemId);
        if ("SERVED".equals(item.status())) {
            return; // 重複勾選（另一台平板剛勾過）當成功
        }
        if (!isUnserved(item.status())) {
            throw ApiException.conflict("ITEM_NOT_SERVABLE", "已取消或報廢的餐點不能標記為已出餐");
        }
        if ("CANCELLED".equals(item.ticketStatus())) {
            throw ApiException.conflict("ITEM_NOT_SERVABLE", "這張訂單已取消，不能標記出餐");
        }

        jdbc.update("""
                UPDATE order_item SET status = 'SERVED', served_at = CURRENT_TIMESTAMP(3)
                WHERE id = ?
                """, itemId);
        kitchenNotificationService.notifyItemServedAfterCommit(item.ticketId(), itemId);
        ticketStatus.refreshFromItems(item.ticketId(), null);
    }

    // 撤回已出餐（勾錯了）；單如果因此不再是全部出完，會回到 PREPARING／PENDING，卡片重新出現
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void unserveOrderItem(Long itemId) {
        LockedItem item = lockItem(itemId);
        if (isUnserved(item.status())) {
            return; // 本來就還沒出，重複撤回當成功
        }
        if (!"SERVED".equals(item.status()) || "CANCELLED".equals(item.ticketStatus())) {
            throw ApiException.conflict("ITEM_NOT_UNSERVABLE", "已取消或報廢的餐點不能撤回出餐");
        }

        jdbc.update("""
                UPDATE order_item SET status = 'PENDING', served_at = NULL
                WHERE id = ?
                """, itemId);
        kitchenNotificationService.notifyItemUnservedAfterCommit(item.ticketId(), itemId);
        ticketStatus.refreshFromItems(item.ticketId(), null);
    }

    public void cancelOrderItem(Long itemId, String cancelReason) {
        cancellationService.cancelItem(itemId, cancelReason);
    }

    // 整單出完：在同一個交易裡把這張單所有還沒出的品項標成已出餐，再由品項推導出 SERVED，
    // 不會出現「單已完成、品項還是待製作」
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void completeTicket(Long ticketId) {
        LockedTicket ticket = lockTicket(ticketId);
        if ("CANCELLED".equals(ticket.status())) {
            throw ApiException.conflict("TICKET_NOT_COMPLETABLE", "已取消的訂單不能標記為整單出完");
        }

        // 品項列也一起鎖住，再一次更新
        jdbc.queryForList("""
                SELECT id FROM order_item
                WHERE order_ticket_id = ? AND status IN ('PENDING', 'PREPARING')
                ORDER BY id
                FOR UPDATE
                """, Long.class, ticketId);
        jdbc.update("""
                UPDATE order_item SET status = 'SERVED', served_at = CURRENT_TIMESTAMP(3)
                WHERE order_ticket_id = ? AND status IN ('PENDING', 'PREPARING')
                """, ticketId);
        // 單已經是 SERVED、也沒有剩下的品項時，這裡什麼都不會改，重複按當成功
        ticketStatus.refreshFromItems(ticketId, null);
    }

    public void cancelTicket(Long ticketId, String cancelReason) {
        cancellationService.cancelTicket(ticketId, cancelReason);
    }

    // 報廢／退菜（M4 4.9）：做壞或客人退回的餐點，已出餐、未出餐都可以報。
    //   ・記原因：order_item.status = CANCELLED、cancel_reason = 原因、wasted_at = 報廢時間
    //     （wasted_at 有值就是報廢，NULL 是一般取消；一般取消走 OrderCancellationService）
    //   ・庫存不回補：食材已經用掉了，所以不碰 inventory_item，也不改 sold_out
    //   ・不計入帳單：CANCELLED 的品項本來就不算錢（BillingCalculator），報廢後重算這桌金額。
    //     M6 不做「退菜折讓」的財務流程，所以只在結帳前從帳單拿掉，已結帳的桌不能再報廢
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void wasteOrderItem(Long itemId, String requestedReason) {
        String reason = validReason(requestedReason);
        Long sessionId = jdbc.query("""
                SELECT ot.dining_session_id FROM order_item oi
                JOIN order_ticket ot ON ot.id = oi.order_ticket_id
                WHERE oi.id = ?
                """, rs -> rs.next() ? rs.getLong(1) : null, itemId);
        if (sessionId == null) {
            throw ApiException.notFound("找不到這筆餐點");
        }

        DiningSessionEntity session = sessions.findWithLockById(sessionId)
                .orElseThrow(() -> ApiException.notFound("找不到用餐場次"));
        LockedItem item = lockItemAfterSession(itemId);
        // 已經報廢過就直接當成功，要排在桌況檢查前面：第一次其實成功了、回應在網路上逾時，
        // 前端重送時這桌剛好結帳，不能因此回 409 讓廚房以為沒報到
        if ("CANCELLED".equals(item.status()) && item.wasted()) {
            return;
        }

        // 會改帳單，跟取消一樣要求這桌還在用餐、也沒有付款進行中
        if (!"OPEN".equals(session.getStatus())) {
            throw ApiException.conflict("SESSION_CLOSED", "此桌已結帳或取消，不能報廢餐點");
        }
        pendingPaymentGuard.requireNoOutstanding(sessionId);

        if ("CANCELLED".equals(item.status())) {
            throw ApiException.conflict("ITEM_NOT_WASTABLE", "已取消的餐點不能報廢");
        }
        if ("CANCELLED".equals(item.ticketStatus())) {
            throw ApiException.conflict("ITEM_NOT_WASTABLE", "這張訂單已取消，不能報廢");
        }

        jdbc.update("""
                UPDATE order_item
                SET status = 'CANCELLED', cancel_reason = ?, wasted_at = CURRENT_TIMESTAMP(3)
                WHERE id = ?
                """, reason, itemId);
        billing.recalculateAndStore(session);
        kitchenNotificationService.notifyItemWastedAfterCommit(item.ticketId(), itemId, reason);
        ticketStatus.refreshFromItems(item.ticketId(), reason);
    }

    // 依鎖的順序鎖住品項所在的 session → 單 → 品項，回傳鎖住後讀到的最新狀態
    private LockedItem lockItem(Long itemId) {
        Long sessionId = jdbc.query("""
                SELECT ot.dining_session_id FROM order_item oi
                JOIN order_ticket ot ON ot.id = oi.order_ticket_id
                WHERE oi.id = ?
                """, rs -> rs.next() ? rs.getLong(1) : null, itemId);
        if (sessionId == null) {
            throw ApiException.notFound("找不到這筆餐點");
        }
        lockSession(sessionId);
        return lockItemAfterSession(itemId);
    }

    // 呼叫前已經鎖住 session；品項所屬的單與 session 不會變，先查再鎖不會鎖錯列
    private LockedItem lockItemAfterSession(Long itemId) {
        Long ticketId = jdbc.queryForObject("SELECT order_ticket_id FROM order_item WHERE id = ?", Long.class, itemId);
        String ticketStatus = jdbc.queryForObject(
                "SELECT status FROM order_ticket WHERE id = ? FOR UPDATE", String.class, ticketId);
        return jdbc.queryForObject("""
                SELECT status, wasted_at IS NOT NULL AS wasted FROM order_item WHERE id = ? FOR UPDATE
                """, (rs, rowNum) -> new LockedItem(ticketId, ticketStatus, rs.getString("status"),
                rs.getBoolean("wasted")), itemId);
    }

    private LockedTicket lockTicket(Long ticketId) {
        Long sessionId = jdbc.query("SELECT dining_session_id FROM order_ticket WHERE id = ?",
                rs -> rs.next() ? rs.getLong(1) : null, ticketId);
        if (sessionId == null) {
            throw ApiException.notFound("找不到這筆廚房訂單");
        }
        lockSession(sessionId);
        String status = jdbc.queryForObject(
                "SELECT status FROM order_ticket WHERE id = ? FOR UPDATE", String.class, ticketId);
        return new LockedTicket(ticketId, status);
    }

    // 出餐狀態不影響金額，所以不檢查這桌是否還在用餐；只拿 session 鎖排隊
    private void lockSession(Long sessionId) {
        jdbc.queryForList("SELECT id FROM dining_session WHERE id = ? FOR UPDATE", Long.class, sessionId);
    }

    private String validReason(String reason) {
        if (reason == null || reason.isBlank() || reason.strip().length() > MAX_REASON_LENGTH) {
            throw ApiException.badRequest("報廢原因必填且不得超過 100 字");
        }
        return reason.strip();
    }

    private boolean isUnserved(String status) {
        return "PENDING".equals(status) || "PREPARING".equals(status);
    }

    private TicketRow mapRow(ResultSet rs) throws SQLException {
        return new TicketRow(
                rs.getLong("order_id"),
                rs.getInt("sequence_no"),
                rs.getTimestamp("placed_at").toLocalDateTime(),
                rs.getString("table_no"),
                rs.getLong("item_id"),
                rs.getString("item_name_snapshot"),
                rs.getInt("quantity"),
                rs.getString("item_status"),
                rs.getString("note"),
                rs.getString("value_name_snapshot"));
    }

    private record LockedItem(Long ticketId, String ticketStatus, String status, boolean wasted) {}

    private record LockedTicket(Long id, String status) {}

    private record TicketRow(
            Long orderId,
            Integer sequenceNo,
            LocalDateTime placedAt,
            String tableNo,
            Long itemId,
            String itemName,
            Integer quantity,
            String itemStatus,
            String note,
            String optionName
    ) {}

    private static class TicketBuilder {
        private final Long orderId;
        private final Integer sequenceNo;
        private final LocalDateTime placedAt;
        private final String tableNo;
        private final Map<Long, ItemBuilder> items = new LinkedHashMap<>();

        private TicketBuilder(Long orderId, Integer sequenceNo, LocalDateTime placedAt, String tableNo) {
            this.orderId = orderId;
            this.sequenceNo = sequenceNo;
            this.placedAt = placedAt;
            this.tableNo = tableNo;
        }

        private KitchenTicketResponse toResponse() {
            return new KitchenTicketResponse(orderId, sequenceNo, placedAt, tableNo,
                    items.values().stream().map(ItemBuilder::toResponse).toList());
        }
    }

    private static class ItemBuilder {
        private final Long id;
        private final String name;
        private final Integer quantity;
        private final String status;
        private final String note;
        private final List<String> options = new ArrayList<>();

        private ItemBuilder(Long id, String name, Integer quantity, String status, String note) {
            this.id = id;
            this.name = name;
            this.quantity = quantity;
            this.status = status;
            this.note = note;
        }

        private KitchenItemResponse toResponse() {
            return new KitchenItemResponse(id, name, quantity, status, List.copyOf(options), note);
        }
    }
}
