package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.dto.KitchenTicketResponse;
import tw.ispan.smartorder.dto.KitchenTicketResponse.KitchenItemResponse;

import javax.sql.DataSource;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class KitchenTicketService {

    private final JdbcTemplate jdbc;
    private final KitchenNotificationService kitchenNotificationService;

    public KitchenTicketService(@Qualifier("smartOrderDataSource") DataSource dataSource,
                                KitchenNotificationService kitchenNotificationService) {
        this.jdbc = new JdbcTemplate(dataSource);
        this.kitchenNotificationService = kitchenNotificationService;
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
                       oio.value_name_snapshot
                FROM order_ticket ot
                JOIN dining_session ds ON ds.id = ot.dining_session_id
                JOIN dining_table dt ON dt.id = ds.table_id
                JOIN order_item oi ON oi.order_ticket_id = ot.id
                LEFT JOIN order_item_option oio ON oio.order_item_id = oi.id
                WHERE ot.status IN ('PENDING', 'PREPARING')
                  AND oi.status <> 'CANCELLED'
                ORDER BY ot.placed_at ASC, ot.id ASC, oi.id ASC, oio.id ASC
                """, (rs, rowNum) -> mapRow(rs));

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

    @Transactional
    public void serveOrderItem(Long itemId) {
        int updated = jdbc.update("""
                UPDATE order_item oi
                JOIN order_ticket ot ON ot.id = oi.order_ticket_id
                SET oi.status = 'SERVED'
                WHERE oi.id = ?
                  AND oi.status IN ('PENDING', 'PREPARING')
                  AND ot.status IN ('PENDING', 'PREPARING')
                """, itemId);

        if (updated == 1) {
            Long ticketId = jdbc.queryForObject(
                    "SELECT order_ticket_id FROM order_item WHERE id = ?", Long.class, itemId);
            kitchenNotificationService.notifyItemServedAfterCommit(ticketId, itemId);
            return;
        }

        String currentStatus = jdbc.query(
                """
                SELECT status FROM order_item WHERE id = ?
                """,
                rs -> rs.next() ? rs.getString("status") : null,
                itemId);

        if (currentStatus == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到這筆餐點");
        }
        if ("SERVED".equals(currentStatus)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "此餐點目前不能標記為已出餐");
    }

    @Transactional
    public void unserveOrderItem(Long itemId) {
        int updated = jdbc.update("""
                UPDATE order_item oi
                JOIN order_ticket ot ON ot.id = oi.order_ticket_id
                SET oi.status = 'PENDING'
                WHERE oi.id = ?
                  AND oi.status = 'SERVED'
                  AND ot.status IN ('PENDING', 'PREPARING')
                """, itemId);

        if (updated == 1) {
            Long ticketId = jdbc.queryForObject(
                    "SELECT order_ticket_id FROM order_item WHERE id = ?", Long.class, itemId);
            kitchenNotificationService.notifyItemUnservedAfterCommit(ticketId, itemId);
            return;
        }

        String currentStatus = jdbc.query("SELECT status FROM order_item WHERE id = ?",
                rs -> rs.next() ? rs.getString("status") : null, itemId);
        if (currentStatus == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到這筆餐點");
        }
        if ("PENDING".equals(currentStatus) || "PREPARING".equals(currentStatus)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "此餐點目前不能取消已出餐狀態");
    }

    @Transactional
    public void cancelOrderItem(Long itemId, String cancelReason) {
        int updated = jdbc.update("""
                UPDATE order_item oi
                JOIN order_ticket ot ON ot.id = oi.order_ticket_id
                SET oi.status = 'CANCELLED', oi.cancel_reason = ?
                WHERE oi.id = ?
                  AND oi.status IN ('PENDING', 'PREPARING')
                  AND ot.status IN ('PENDING', 'PREPARING')
                """, cancelReason, itemId);

        if (updated == 1) {
            Long ticketId = jdbc.queryForObject(
                    "SELECT order_ticket_id FROM order_item WHERE id = ?", Long.class, itemId);
            kitchenNotificationService.notifyItemCancelledAfterCommit(ticketId, itemId, cancelReason);
            return;
        }

        String currentStatus = jdbc.query("SELECT status FROM order_item WHERE id = ?",
                rs -> rs.next() ? rs.getString("status") : null, itemId);
        if (currentStatus == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到這筆餐點");
        }
        if ("CANCELLED".equals(currentStatus)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "此餐點目前不能取消");
    }

    @Transactional
    public void completeTicket(Long ticketId) {
        int updated = jdbc.update("""
                UPDATE order_ticket
                SET status = 'SERVED'
                WHERE id = ? AND status IN ('PENDING', 'PREPARING')
                """, ticketId);

        if (updated == 1) {
            kitchenNotificationService.notifyTicketCompletedAfterCommit(ticketId);
            return;
        }

        String currentStatus = jdbc.query("SELECT status FROM order_ticket WHERE id = ?",
                rs -> rs.next() ? rs.getString("status") : null, ticketId);
        if (currentStatus == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到這筆廚房訂單");
        }
        if ("SERVED".equals(currentStatus)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "此訂單目前不能標記為整單出完");
    }

    @Transactional
    public void cancelTicket(Long ticketId, String cancelReason) {
        int updated = jdbc.update("""
                UPDATE order_ticket
                SET status = 'CANCELLED', cancel_reason = ?
                WHERE id = ? AND status IN ('PENDING', 'PREPARING')
                """, cancelReason, ticketId);

        if (updated == 1) {
            kitchenNotificationService.notifyTicketCancelledAfterCommit(ticketId, cancelReason);
            return;
        }

        String currentStatus = jdbc.query("SELECT status FROM order_ticket WHERE id = ?",
                rs -> rs.next() ? rs.getString("status") : null, ticketId);
        if (currentStatus == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "找不到這筆廚房訂單");
        }
        if ("CANCELLED".equals(currentStatus)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "此訂單目前不能取消");
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
