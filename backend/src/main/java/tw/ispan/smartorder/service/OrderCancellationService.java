package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tw.ispan.smartorder.common.exception.ApiException;
import tw.ispan.smartorder.entity.DiningSessionEntity;
import tw.ispan.smartorder.repository.DiningSessionRepository;
import tw.ispan.smartorder.repository.InventoryRepository;
import tw.ispan.smartorder.repository.MenuItemRepository;

import javax.sql.DataSource;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** Cancellation of unserved food. Waste/returns of served food use a different policy. */
@Service
public class OrderCancellationService {
    @org.springframework.beans.factory.annotation.Autowired
    private PendingPaymentGuard pendingPaymentGuard;
    private final JdbcTemplate jdbc;
    private final DiningSessionRepository sessions;
    private final InventoryRepository inventory;
    private final MenuItemRepository menuItems;
    private final BillingCalculator billing;
    private final MenuStatusNotifier menuNotifier;
    private final KitchenNotificationService kitchenNotifier;
    private final OrderTicketStatusUpdater ticketStatusUpdater;

    public OrderCancellationService(@Qualifier("smartOrderDataSource") DataSource dataSource,
                                    DiningSessionRepository sessions, InventoryRepository inventory,
                                    MenuItemRepository menuItems, BillingCalculator billing,
                                    MenuStatusNotifier menuNotifier,
                                    KitchenNotificationService kitchenNotifier,
                                    OrderTicketStatusUpdater ticketStatusUpdater) {
        this.jdbc = new JdbcTemplate(dataSource);
        this.sessions = sessions;
        this.inventory = inventory;
        this.menuItems = menuItems;
        this.billing = billing;
        this.menuNotifier = menuNotifier;
        this.kitchenNotifier = kitchenNotifier;
        this.ticketStatusUpdater = ticketStatusUpdater;
    }

    private record Item(Long id, Long menuItemId, int quantity, String status) {}
    private record Menu(boolean trackInventory, boolean soldOut) {}

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void cancelItem(Long itemId, String requestedReason) {
        String reason = validReason(requestedReason);
        Long sessionId = jdbc.query("""
                SELECT ot.dining_session_id FROM order_item oi
                JOIN order_ticket ot ON ot.id = oi.order_ticket_id WHERE oi.id = ?
                """, rs -> rs.next() ? rs.getLong(1) : null, itemId);
        if (sessionId == null) throw ApiException.notFound("找不到這筆餐點");
        DiningSessionEntity session = lockOpenSession(sessionId);
        Long ticketId = jdbc.queryForObject("SELECT order_ticket_id FROM order_item WHERE id = ?", Long.class, itemId);
        String ticketStatus = jdbc.queryForObject("SELECT status FROM order_ticket WHERE id = ?", String.class, ticketId);
        Item item = jdbc.query("SELECT id, menu_item_id, quantity, status FROM order_item WHERE id = ?",
                rs -> rs.next() ? mapItem(rs) : null, itemId);
        if (item == null) throw ApiException.notFound("找不到這筆餐點");
        if ("CANCELLED".equals(item.status())) return;
        if (!isOpenTicket(ticketStatus) || !isUnserved(item.status())) {
            throw ApiException.conflict("ITEM_NOT_CANCELLABLE", "已出餐或已完成的餐點不能取消");
        }

        Map<Long, Menu> menus = lockMenus(List.of(item));
        int updated = jdbc.update("""
                UPDATE order_item oi
                JOIN order_ticket ot ON ot.id = oi.order_ticket_id
                SET oi.status = 'CANCELLED', oi.cancel_reason = ?
                WHERE oi.id = ? AND oi.status IN ('PENDING', 'PREPARING')
                  AND ot.status IN ('PENDING', 'PREPARING')
                """, reason, itemId);
        if (updated != 1) throw ApiException.conflict("ITEM_NOT_CANCELLABLE", "此餐點目前不能取消");
        restoreInventory(List.of(item), menus);

        // 跟出菜看板用同一份推導（OrderTicketStatusUpdater）：品項全部取消 → CANCELLED 並推 TICKET_CANCELLED；
        // 取消的是最後一個還沒出的品項、其他未取消的都已出餐 → SERVED 並推 TICKET_SERVED，KDS 卡片自動淡出。
        // 已經持有 session 鎖，這裡最後才更新 order_ticket，鎖順序維持 session → menu_item → order_item → order_ticket
        ticketStatusUpdater.refreshFromItems(ticketId, reason);
        billing.recalculateAndStore(session);
        kitchenNotifier.notifyItemCancelledAfterCommit(ticketId, itemId, reason);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void cancelTicket(Long ticketId, String requestedReason) {
        String reason = validReason(requestedReason);
        Long sessionId = jdbc.query("SELECT dining_session_id FROM order_ticket WHERE id = ?",
                rs -> rs.next() ? rs.getLong(1) : null, ticketId);
        if (sessionId == null) throw ApiException.notFound("找不到這筆廚房訂單");
        DiningSessionEntity session = lockOpenSession(sessionId);
        String status = jdbc.queryForObject("SELECT status FROM order_ticket WHERE id = ?", String.class, ticketId);
        if ("CANCELLED".equals(status)) return;
        if (!isOpenTicket(status)) {
            throw ApiException.conflict("TICKET_NOT_CANCELLABLE", "已出餐的整張訂單不能取消");
        }
        List<Item> items = jdbc.query("""
                SELECT id, menu_item_id, quantity, status FROM order_item
                WHERE order_ticket_id = ? ORDER BY id
                """, (rs, row) -> mapItem(rs), ticketId);
        if (items.stream().anyMatch(item -> !"CANCELLED".equals(item.status()) && !isUnserved(item.status()))) {
            throw ApiException.conflict("TICKET_NOT_CANCELLABLE", "訂單含已出餐餐點，請逐項處理未出餐餐點");
        }
        List<Item> cancellable = items.stream().filter(item -> isUnserved(item.status())).toList();
        Map<Long, Menu> menus = lockMenus(cancellable);
        for (Item item : cancellable) {
            int updated = jdbc.update("""
                    UPDATE order_item oi
                    JOIN order_ticket ot ON ot.id = oi.order_ticket_id
                    SET oi.status = 'CANCELLED', oi.cancel_reason = ?
                    WHERE oi.id = ? AND oi.status IN ('PENDING', 'PREPARING')
                      AND ot.status IN ('PENDING', 'PREPARING')
                    """, reason, item.id());
            if (updated != 1) throw ApiException.conflict("TICKET_NOT_CANCELLABLE", "訂單狀態已變動，請重試");
        }
        restoreInventory(cancellable, menus);
        int ticketUpdated = jdbc.update("""
                UPDATE order_ticket SET status = 'CANCELLED', cancel_reason = ?
                WHERE id = ? AND status IN ('PENDING', 'PREPARING')
                """, reason, ticketId);
        if (ticketUpdated != 1) {
            throw ApiException.conflict("TICKET_NOT_CANCELLABLE", "訂單狀態已變動，請重試");
        }
        billing.recalculateAndStore(session);
        kitchenNotifier.notifyTicketCancelledAfterCommit(ticketId, reason);
    }

    private DiningSessionEntity lockOpenSession(Long sessionId) {
        DiningSessionEntity session = sessions.findWithLockById(sessionId)
                .orElseThrow(() -> ApiException.notFound("找不到用餐場次"));
        if (!"OPEN".equals(session.getStatus())) {
            throw ApiException.conflict("SESSION_CLOSED", "此桌已結帳或取消，不能修改餐點");
        }
        pendingPaymentGuard.requireNoOutstanding(sessionId);
        return session;
    }

    private Map<Long, Menu> lockMenus(List<Item> items) {
        Map<Long, Menu> result = new HashMap<>();
        for (Long id : items.stream().map(Item::menuItemId).distinct().sorted().toList()) {
            Menu menu = jdbc.query("""
                    SELECT track_inventory, sold_out FROM menu_item WHERE id = ? FOR UPDATE
                    """, rs -> rs.next() ? new Menu(rs.getBoolean(1), rs.getBoolean(2)) : null, id);
            if (menu == null) throw ApiException.conflict("INVENTORY_MISSING", "商品已不存在");
            result.put(id, menu);
        }
        return result;
    }

    private void restoreInventory(List<Item> items, Map<Long, Menu> menus) {
        Map<Long, Integer> restore = new TreeMap<>();
        for (Item item : items) {
            if (menus.get(item.menuItemId()).trackInventory()) {
                restore.merge(item.menuItemId(), item.quantity(), Integer::sum);
            }
        }
        for (var entry : restore.entrySet()) {
            Long menuId = entry.getKey();
            if (inventory.increase(menuId, entry.getValue()) != 1) {
                throw ApiException.conflict("INVENTORY_MISSING", "商品庫存不存在");
            }
            if (menus.get(menuId).soldOut()) {
                menuItems.updateSoldOut(menuId, false);
                menuNotifier.notifyAfterCommit(menuId, false);
            }
        }
    }

    private String validReason(String reason) {
        if (reason == null || reason.isBlank() || reason.strip().length() > 100) {
            throw ApiException.badRequest("取消原因必填且不得超過 100 字");
        }
        return reason.strip();
    }

    private boolean isOpenTicket(String status) {
        return "PENDING".equals(status) || "PREPARING".equals(status);
    }

    private boolean isUnserved(String status) {
        return "PENDING".equals(status) || "PREPARING".equals(status);
    }

    private Item mapItem(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Item(rs.getLong("id"), rs.getLong("menu_item_id"), rs.getInt("quantity"),
                rs.getString("status"));
    }
}
