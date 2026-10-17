package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class OrderHistoryService {
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");
    private final JdbcTemplate jdbc;

    public OrderHistoryService(@Qualifier("smartOrderDataSource") DataSource dataSource) {
        this.jdbc = new JdbcTemplate(dataSource);
    }

    public HistoryResponse getHistory(long sessionId) {
        SessionRow session = jdbc.query("""
                SELECT t.table_no, s.adult_count + s.child_count AS guest_count,
                       s.subtotal, s.opened_at, s.updated_at
                FROM dining_session s
                JOIN dining_table t ON t.id = s.table_id
                WHERE s.id = ? AND s.status = 'OPEN'
                """, rs -> rs.next() ? new SessionRow(
                rs.getString("table_no"), rs.getInt("guest_count"), rs.getBigDecimal("subtotal"),
                rs.getTimestamp("opened_at").toLocalDateTime(), rs.getTimestamp("updated_at").toLocalDateTime()) : null,
                sessionId);
        if (session == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "\u7528\u9910\u5834\u6b21\u5df2\u7d50\u675f");

        List<TicketResponse> orders = jdbc.query("""
                SELECT id, sequence_no, status, placed_at
                FROM order_ticket WHERE dining_session_id = ?
                ORDER BY sequence_no DESC, id DESC
                """, (rs, rowNum) -> mapTicket(rs), sessionId);

        LocalDateTime now = LocalDateTime.now();
        HistoryTableInfo tableInfo = new HistoryTableInfo(session.tableNo() + " \u684c", session.guestCount(),
                session.subtotal(), format(session.openedAt()),
                Math.max(0, Duration.between(session.openedAt(), now).toMinutes()), format(session.updatedAt()),
                "\u76ee\u524d\u91d1\u984d\uff08\u672a\u542b\u670d\u52d9\u8cbb\uff09");
        return new HistoryResponse(tableInfo, orders);
    }

    private TicketResponse mapTicket(ResultSet rs) throws SQLException {
        long ticketId = rs.getLong("id");
        int sequence = rs.getInt("sequence_no");
        String status = rs.getString("status");
        LocalDateTime placedAt = rs.getTimestamp("placed_at").toLocalDateTime();
        List<ItemResponse> items = jdbc.query("""
                SELECT id, item_name_snapshot, quantity, status, note
                FROM order_item WHERE order_ticket_id = ? ORDER BY id
                """, (itemRs, rowNum) -> mapItem(itemRs), ticketId);
        return new TicketResponse(ticketId, "\u7b2c " + sequence + " \u55ae", format(placedAt),
                "CANCELLED".equals(status) ? "\u5df2\u53d6\u6d88" : null, "plain", false, items);
    }

    private ItemResponse mapItem(ResultSet rs) throws SQLException {
        long itemId = rs.getLong("id");
        String itemStatus = rs.getString("status");
        List<String> specs = jdbc.query("""
                SELECT value_name_snapshot FROM order_item_option
                WHERE order_item_id = ? ORDER BY id
                """, (optionRs, optionRow) -> optionRs.getString(1), itemId);
        String note = rs.getString("note");
        if (note != null && !note.isBlank()) specs.add("\u5099\u8a3b\uff1a" + note);
        String statusText = switch (itemStatus) {
            case "SERVED" -> "\u5df2\u51fa\u9910";
            case "CANCELLED" -> "\u5df2\u53d6\u6d88";
            case "PENDING" -> "\u5f85\u88fd\u4f5c";
            default -> itemStatus;
        };
        String statusColor = "SERVED".equals(itemStatus) ? "done"
                : "CANCELLED".equals(itemStatus) ? "plain" : "wait";
        return new ItemResponse(itemId, rs.getString("item_name_snapshot"), rs.getInt("quantity"),
                statusText, statusColor, "SERVED".equals(itemStatus) ? "check" : "clock",
                String.join("\u30fb", specs));
    }

    private static String format(LocalDateTime value) {
        return value.format(TIME_FORMAT);
    }

    private record SessionRow(String tableNo, int guestCount, BigDecimal subtotal,
                              LocalDateTime openedAt, LocalDateTime updatedAt) {}
    public record HistoryResponse(HistoryTableInfo tableInfo, List<TicketResponse> orders) {}
    public record HistoryTableInfo(String tableName, int guestCount, BigDecimal totalAmount,
                                   String seatedTime, long elapsedMinutes, String lastSyncTime, String note) {}
    public record TicketResponse(long orderId, String orderTitle, String submitTime, String badgeText,
                                 String badgeCol, boolean isUrgent, List<ItemResponse> items) {}
    public record ItemResponse(long id, String name, int quantity, String statusText,
                               String statusCol, String iconType, String specs) {}
}
