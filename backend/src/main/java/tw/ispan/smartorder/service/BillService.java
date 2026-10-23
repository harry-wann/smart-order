package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tw.ispan.smartorder.dto.BillResponse;
import tw.ispan.smartorder.dto.BillResponse.BillItem;
import tw.ispan.smartorder.dto.BillResponse.BillTicket;
import tw.ispan.smartorder.config.EcpayProperties;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class BillService {
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private final JdbcTemplate jdbc;
    private final EcpayProperties ecpayProperties;

    public BillService(@Qualifier("smartOrderDataSource") DataSource dataSource,
                       EcpayProperties ecpayProperties) {
        this.jdbc = new JdbcTemplate(dataSource);
        this.ecpayProperties = ecpayProperties;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public BillResponse calculateBill(long sessionId) {
        // All bill writers use this session lock. Take it before any ordinary read.
        jdbc.queryForList("SELECT id FROM dining_session WHERE id = ? FOR UPDATE", Long.class, sessionId);
        SessionRow session = jdbc.query("""
                SELECT t.table_no, s.adult_count, s.child_count, s.opened_at
                FROM dining_session s
                JOIN dining_table t ON t.id = s.table_id
                WHERE s.id = ? AND s.status = 'OPEN'
                """, rs -> rs.next() ? new SessionRow(
                        rs.getString("table_no"),
                        rs.getInt("adult_count") + rs.getInt("child_count"),
                        toLocal(rs.getTimestamp("opened_at")))
                        : null,
                sessionId);
        if (session == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "DINING_SESSION_ENDED");
        }

        List<ItemRow> rows = jdbc.query("""
                SELECT ot.id AS ticket_id, ot.sequence_no, ot.placed_at,
                       oi.id AS item_id, oi.item_name_snapshot, oi.quantity, oi.line_total, oi.note
                FROM order_ticket ot
                JOIN order_item oi ON oi.order_ticket_id = ot.id
                WHERE ot.dining_session_id = ?
                  AND ot.status <> 'CANCELLED'
                  AND oi.status <> 'CANCELLED'
                ORDER BY ot.sequence_no, oi.id
                """, (rs, i) -> new ItemRow(
                        rs.getLong("ticket_id"),
                        rs.getInt("sequence_no"),
                        toLocal(rs.getTimestamp("placed_at")),
                        rs.getLong("item_id"),
                        rs.getString("item_name_snapshot"),
                        rs.getInt("quantity"),
                        rs.getBigDecimal("line_total"),
                        rs.getString("note")),
                sessionId);

        Map<Long, List<String>> optionsByItem = loadOptions(sessionId);

        Map<Long, List<ItemRow>> rowsByTicket = new LinkedHashMap<>();
        for (ItemRow row : rows) {
            rowsByTicket.computeIfAbsent(row.ticketId(), id -> new ArrayList<>()).add(row);
        }

        List<BillTicket> tickets = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        int itemCount = 0;

        for (List<ItemRow> ticketRows : rowsByTicket.values()) {
            ItemRow first = ticketRows.get(0);
            BigDecimal ticketTotal = BigDecimal.ZERO;
            List<BillItem> items = new ArrayList<>();

            for (ItemRow row : ticketRows) {
                ticketTotal = ticketTotal.add(row.lineTotal());
                itemCount += row.quantity();
                items.add(new BillItem(
                        row.itemId(),
                        row.name(),
                        row.quantity(),
                        row.lineTotal(),
                        optionsByItem.getOrDefault(row.itemId(), List.of()),
                        row.note()));
            }

            subtotal = subtotal.add(ticketTotal);
            tickets.add(new BillTicket(first.ticketId(), first.sequenceNo(), format(first.placedAt()), ticketTotal, items));
        }

        BillingCalculator.Amount amount = BillingCalculator.fromSubtotal(subtotal);

        return new BillResponse(
                session.tableNo(),
                format(session.openedAt()),
                format(LocalDateTime.now()),
                session.guestCount(),
                itemCount,
                amount.subtotal(),
                amount.serviceFee(),
                amount.total(),
                tickets,
                ecpayProperties.available());
    }

    private Map<Long, List<String>> loadOptions(long sessionId) {
        Map<Long, List<String>> result = new HashMap<>();
        jdbc.query("""
                SELECT oio.order_item_id, oio.value_name_snapshot
                FROM order_item_option oio
                JOIN order_item oi   ON oi.id = oio.order_item_id
                JOIN order_ticket ot ON ot.id = oi.order_ticket_id
                WHERE ot.dining_session_id = ?
                ORDER BY oio.id
                """, rs -> {
                    result.computeIfAbsent(rs.getLong("order_item_id"), id -> new ArrayList<>())
                            .add(rs.getString("value_name_snapshot"));
                },
                sessionId);
        return result;
    }

    private static LocalDateTime toLocal(Timestamp ts) {
        return ts == null ? null : ts.toLocalDateTime();
    }

    private static String format(LocalDateTime time) {
        return time == null ? "" : time.format(HH_MM);
    }

    private record SessionRow(String tableNo, int guestCount, LocalDateTime openedAt) {}

    private record ItemRow(long ticketId, int sequenceNo, LocalDateTime placedAt,
                           long itemId, String name, int quantity, BigDecimal lineTotal, String note) {}
}
