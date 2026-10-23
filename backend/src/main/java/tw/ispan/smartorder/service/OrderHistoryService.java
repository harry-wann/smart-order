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
        if (session == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "DINING_SESSION_ENDED");

        List<TicketResponse> orders = jdbc.query("""
                SELECT id, sequence_no, status, placed_at
                FROM order_ticket WHERE dining_session_id = ?
                ORDER BY sequence_no DESC, id DESC
                """, (rs, rowNum) -> mapTicket(rs), sessionId);

        LocalDateTime now = LocalDateTime.now();
        HistoryTableInfo tableInfo = new HistoryTableInfo(session.tableNo(), session.guestCount(),
                session.subtotal(), format(session.openedAt()),
                Math.max(0, Duration.between(session.openedAt(), now).toMinutes()), format(session.updatedAt()));
        return new HistoryResponse(tableInfo, orders);
    }

    private TicketResponse mapTicket(ResultSet rs) throws SQLException {
        long ticketId = rs.getLong("id");
        int sequence = rs.getInt("sequence_no");
        String status = rs.getString("status");
        LocalDateTime placedAt = rs.getTimestamp("placed_at").toLocalDateTime();
        // 報廢（退菜）在資料庫是 CANCELLED + wasted_at，給顧客看時另外標成 WASTED，C-08 才分得出「已取消」與「已退菜」
        List<ItemResponse> items = jdbc.query("""
                SELECT id, item_name_snapshot, quantity, note,
                       CASE WHEN status = 'CANCELLED' AND wasted_at IS NOT NULL THEN 'WASTED' ELSE status END AS status
                FROM order_item WHERE order_ticket_id = ? ORDER BY id
                """, (itemRs, rowNum) -> mapItem(itemRs), ticketId);
        return new TicketResponse(ticketId, sequence, format(placedAt), status, items);
    }

    private ItemResponse mapItem(ResultSet rs) throws SQLException {
        long itemId = rs.getLong("id");
        String itemStatus = rs.getString("status");
        List<String> options = jdbc.query("""
                SELECT value_name_snapshot FROM order_item_option
                WHERE order_item_id = ? ORDER BY id
                """, (optionRs, optionRow) -> optionRs.getString(1), itemId);
        String note = rs.getString("note");
        return new ItemResponse(itemId, rs.getString("item_name_snapshot"), rs.getInt("quantity"),
                itemStatus, options, note);
    }

    private static String format(LocalDateTime value) {
        return value.format(TIME_FORMAT);
    }

    private record SessionRow(String tableNo, int guestCount, BigDecimal subtotal,
                              LocalDateTime openedAt, LocalDateTime updatedAt) {}
    public record HistoryResponse(HistoryTableInfo tableInfo, List<TicketResponse> orders) {}
    public record HistoryTableInfo(String tableNo, int guestCount, BigDecimal totalAmount,
                                   String seatedTime, long elapsedMinutes, String lastSyncTime) {}
    public record TicketResponse(long orderId, int sequenceNo, String submitTime, String status,
                                 List<ItemResponse> items) {}
    // status：PENDING／SERVED／CANCELLED／WASTED（報廢、退菜）
    public record ItemResponse(long id, String name, int quantity, String status,
                               List<String> options, String note) {}
}
