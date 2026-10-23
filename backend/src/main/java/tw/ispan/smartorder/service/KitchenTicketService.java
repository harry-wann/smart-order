package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.dto.KitchenCompletedTicketResponse;
import tw.ispan.smartorder.dto.KitchenTicketResponse;
import tw.ispan.smartorder.dto.KitchenTicketResponse.KitchenItemResponse;
import tw.ispan.smartorder.entity.DiningSessionEntity;
import tw.ispan.smartorder.repository.DiningSessionRepository;

import javax.sql.DataSource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

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

    // 4.7 出餐順序（鍋底 → 菜盤 → 肉品），用 04 §4.12 更細的六級 cookOrder：
    //   1 鍋底、2 菜盤、3 火鍋料、4 肉品、5 主食、6 飲料甜點
    //   鍋底品項（menu_item.is_soup_base = 1）固定 1，不管放在哪個分類
    //   其他品項用所屬分類的 menu_category.cook_order（店長在菜單管理設定），不看分類名稱，改名也不會亂掉；
    //   品項或分類查不到時當 2（菜盤），跟資料表的預設值一樣
    // 同一級裡照點餐順序（order_item.id）
    private static final int DEFAULT_COOK_ORDER = 2;
    private static final int MAX_REASON_LENGTH = 100;

    // 「最近完成」分頁（S-04）看最近 60 分鐘內完成的單，最新的在前、最多 50 張。
    // 這個分頁是讓廚師把誤勾最後一道菜、卡片已經淡出的單找回來撤回，通常幾分鐘內就會發現，一小時很寬鬆；
    // 50 張大約是全店尖峰一小時完成的單數，也讓每次推播後的重抓維持是小查詢
    private static final int RECENT_WINDOW_MINUTES = 60;
    private static final int RECENT_LIMIT = 50;

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
        return findTickets("ot.status IN ('PENDING', 'PREPARING')");
    }

    // 最近完成分頁：完成時間在最近 60 分鐘內的 SERVED 單，最新的在前、最多 50 張，每張多帶完成時間。
    //   ・只列用餐中（dining_session.status = OPEN）的桌：這個分頁是給還在用餐的桌修正誤勾用的，
    //     已結帳或取消的桌本來就不能撤回出餐（unserveOrderItem 會回 409 SESSION_CLOSED）
    //   ・完成時間 = 這張單已出餐品項的 served_at 最大值，也就是最後一道菜出餐的時間。
    //     不用 order_ticket.updated_at：那是任何一欄被改都會跟著變的紀錄欄位，以後單上多改一個欄位就不準了；
    //     served_at 只在出餐時寫入、撤回時清空，意思最明確。
    //     例外：單是因為最後一道還沒出的品項被取消或報廢才變成 SERVED 時，完成時間是在那之前最後一道菜出餐的時間
    //   ・分兩步查：先挑出要顯示的單與完成時間（範圍、排序、張數上限都在這一步），
    //     再用看板同一段查詢（findTickets）拿品項，品項格式與出餐順序跟進行中的卡片一樣，不另寫一份排序
    //   ・第一步先用 placed_at 只看一天內送出的單（走 idx_order_ticket_status），不然每次重抓都要掃過所有歷史的已完成單；
    //     一桌用餐 100 分鐘，送出超過一天才出完的單不會有
    public List<KitchenCompletedTicketResponse> getRecentCompletedTickets() {
        List<CompletedTicket> completed = jdbc.query("""
                SELECT ot.id, MAX(oi.served_at) AS completed_at
                FROM order_ticket ot
                JOIN dining_session ds ON ds.id = ot.dining_session_id
                JOIN order_item oi ON oi.order_ticket_id = ot.id
                WHERE ot.status = 'SERVED'
                  AND ot.placed_at >= CURRENT_TIMESTAMP(3) - INTERVAL 1 DAY
                  AND ds.status = 'OPEN'
                  AND oi.status = 'SERVED'
                GROUP BY ot.id
                HAVING completed_at >= CURRENT_TIMESTAMP(3) - INTERVAL ? MINUTE
                ORDER BY completed_at DESC, ot.id DESC
                LIMIT ?
                """, (rs, rowNum) -> new CompletedTicket(rs.getLong("id"),
                rs.getTimestamp("completed_at").toLocalDateTime()), RECENT_WINDOW_MINUTES, RECENT_LIMIT);
        if (completed.isEmpty()) {
            return List.of();
        }

        String placeholders = String.join(", ", Collections.nCopies(completed.size(), "?"));
        Map<Long, KitchenTicketResponse> ticketsById = new HashMap<>();
        for (KitchenTicketResponse ticket : findTickets(
                "ot.status = 'SERVED' AND ds.status = 'OPEN' AND ot.id IN (" + placeholders + ")",
                completed.stream().map(CompletedTicket::id).toArray())) {
            ticketsById.put(ticket.orderId(), ticket);
        }
        // 照第一步的完成時間排序；兩步之間剛好被撤回（不再是 SERVED）或結帳的單，第二步查不到就略過
        return completed.stream()
                .filter(done -> ticketsById.containsKey(done.id()))
                .map(done -> KitchenCompletedTicketResponse.of(ticketsById.get(done.id()), done.completedAt()))
                .toList();
    }

    // 看板（進行中）與最近完成分頁共用這一段查詢：品項格式、單內出餐順序（item_cook_order）都一樣，只差挑哪些單。
    // ticketFilter 只傳這個類別裡寫死的條件，不能放外面來的字串；要帶的值一律寫成 ?，依序放在 filterArgs
    private List<KitchenTicketResponse> findTickets(String ticketFilter, Object... filterArgs) {
        // 出餐順序的 ?（分類沒設定時的預設值）在 WHERE 前面，所以排第一個，後面才是 ticketFilter 的值
        Object[] args = Stream.concat(Stream.of(DEFAULT_COOK_ORDER), Arrays.stream(filterArgs)).toArray();
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
                           WHEN mi.is_soup_base = 1 THEN 1
                           ELSE COALESCE(mc.cook_order, ?)
                       END AS item_cook_order
                FROM order_ticket ot
                JOIN dining_session ds ON ds.id = ot.dining_session_id
                JOIN dining_table dt ON dt.id = ds.table_id
                JOIN order_item oi ON oi.order_ticket_id = ot.id
                LEFT JOIN menu_item mi ON mi.id = oi.menu_item_id
                LEFT JOIN menu_category mc ON mc.id = mi.category_id
                LEFT JOIN order_item_option oio ON oio.order_item_id = oi.id
                WHERE (%s)
                  AND oi.status <> 'CANCELLED'
                ORDER BY ot.placed_at ASC, ot.id ASC, item_cook_order ASC, oi.id ASC, oio.id ASC
                """.formatted(ticketFilter), (rs, rowNum) -> mapRow(rs), args);

        Map<Long, TicketBuilder> tickets = new LinkedHashMap<>();
        for (TicketRow row : rows) {
            TicketBuilder ticket = tickets.computeIfAbsent(row.orderId(), id -> new TicketBuilder(
                    row.orderId(), row.sequenceNo(), row.placedAt(), row.tableNo()));
            ItemBuilder item = ticket.items.computeIfAbsent(row.itemId(), id -> new ItemBuilder(
                    row.itemId(), row.itemName(), row.quantity(), row.itemStatus(), row.note(), row.cookOrder()));
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

    // 撤回已出餐（勾錯了）；單如果因此不再是全部出完，會回到 PREPARING／PENDING，卡片重新出現。
    // 這桌已結帳或取消就不能撤回：撤回會把單重新打開，已經離開的那桌又出現在看板上，廚房會以為還要出菜
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void unserveOrderItem(Long itemId) {
        LockedItem item = lockItem(itemId);
        if (isUnserved(item.status())) {
            // 本來就還沒出，重複撤回當成功。排在桌況檢查前面（跟報廢一樣）：第一次其實成功了、回應在網路上逾時，
            // 重送時這桌剛好結帳，不能因此回 409 讓廚房以為沒撤回
            return;
        }
        if (!"OPEN".equals(item.sessionStatus())) {
            throw ApiException.conflict("SESSION_CLOSED", "此桌已結帳或取消，不能撤回出餐");
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
    //   ・記是誰報的：wasted_by_staff_id = 登入的員工（controller 從 StaffPrincipal 拿），以後追查退菜金額用
    //   ・庫存不回補：食材已經用掉了，所以不碰 inventory_item，也不改 sold_out
    //   ・不計入帳單：CANCELLED 的品項本來就不算錢（BillingCalculator），報廢後重算這桌金額。
    //     M6 不做「退菜折讓」的財務流程，所以只在結帳前從帳單拿掉，已結帳的桌不能再報廢
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void wasteOrderItem(Long itemId, String requestedReason, Long staffId) {
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
        LockedItem item = lockItemAfterSession(itemId, session.getStatus());
        // 已經報廢過就直接當成功，要排在桌況檢查前面：第一次其實成功了、回應在網路上逾時，
        // 前端重送時這桌剛好結帳，不能因此回 409 讓廚房以為沒報到。
        // 原因、報廢時間、報廢的員工都保留第一次的，重送（就算換了一台平板、另一位員工）不覆寫
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
                SET status = 'CANCELLED', cancel_reason = ?, wasted_at = CURRENT_TIMESTAMP(3), wasted_by_staff_id = ?
                WHERE id = ?
                """, reason, staffId, itemId);
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
        String sessionStatus = lockSession(sessionId);
        return lockItemAfterSession(itemId, sessionStatus);
    }

    // 呼叫前已經鎖住 session（sessionStatus 是鎖住後讀到的這桌狀態）；品項所屬的單與 session 不會變，先查再鎖不會鎖錯列
    private LockedItem lockItemAfterSession(Long itemId, String sessionStatus) {
        Long ticketId = jdbc.queryForObject("SELECT order_ticket_id FROM order_item WHERE id = ?", Long.class, itemId);
        String ticketStatus = jdbc.queryForObject(
                "SELECT status FROM order_ticket WHERE id = ? FOR UPDATE", String.class, ticketId);
        return jdbc.queryForObject("""
                SELECT status, wasted_at IS NOT NULL AS wasted FROM order_item WHERE id = ? FOR UPDATE
                """, (rs, rowNum) -> new LockedItem(ticketId, sessionStatus, ticketStatus, rs.getString("status"),
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

    // 拿 session 鎖排隊，回傳鎖住後讀到的這桌狀態（OPEN／PAID／CANCELLED）。
    // 出餐、整單出完不影響金額，不檢查這桌是否還在用餐；撤回出餐要擋已結帳的桌（見 unserveOrderItem）
    private String lockSession(Long sessionId) {
        return jdbc.query("SELECT status FROM dining_session WHERE id = ? FOR UPDATE",
                rs -> rs.next() ? rs.getString(1) : null, sessionId);
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
                rs.getString("value_name_snapshot"),
                rs.getInt("item_cook_order"));
    }

    private record LockedItem(Long ticketId, String sessionStatus, String ticketStatus, String status, boolean wasted) {}

    private record LockedTicket(Long id, String status) {}

    private record CompletedTicket(Long id, LocalDateTime completedAt) {}

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
            String optionName,
            Integer cookOrder
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
        private final Integer cookOrder;
        private final List<String> options = new ArrayList<>();

        private ItemBuilder(Long id, String name, Integer quantity, String status, String note, Integer cookOrder) {
            this.id = id;
            this.name = name;
            this.quantity = quantity;
            this.status = status;
            this.note = note;
            this.cookOrder = cookOrder;
        }

        private KitchenItemResponse toResponse() {
            return new KitchenItemResponse(id, name, quantity, status, List.copyOf(options), note, cookOrder);
        }
    }
}
