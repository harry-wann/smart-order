package tw.ispan.smartorder.service;

import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tw.ispan.smartorder.entity.DiningSessionEntity;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.math.RoundingMode;

/** Call while holding the dining_session row lock in the smartorder transaction. */
@Service
public class BillingCalculator {
    private static final BigDecimal SERVICE_RATE = new BigDecimal("0.10");
    private final JdbcTemplate jdbc;
    private final EntityManager entityManager;
    private final BillingNotifier notifier;

    public BillingCalculator(@Qualifier("smartOrderDataSource") DataSource dataSource,
                             EntityManager entityManager, BillingNotifier notifier) {
        this.jdbc = new JdbcTemplate(dataSource);
        this.entityManager = entityManager;
        this.notifier = notifier;
    }

    public record Amount(BigDecimal subtotal, BigDecimal serviceFee, BigDecimal total) {}

    public static Amount fromSubtotal(BigDecimal rawSubtotal) {
        BigDecimal subtotal = (rawSubtotal == null ? BigDecimal.ZERO : rawSubtotal)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal serviceFee = subtotal.multiply(SERVICE_RATE).setScale(2, RoundingMode.HALF_UP);
        return new Amount(subtotal, serviceFee, subtotal.add(serviceFee));
    }

    public Amount calculate(Long sessionId) {
        // Hibernate inserts must reach the same connection before this SQL sees the new snapshots.
        entityManager.flush();
        BigDecimal subtotal = jdbc.queryForObject("""
                SELECT COALESCE(SUM(oi.line_total), 0)
                FROM order_item oi
                JOIN order_ticket ot ON ot.id = oi.order_ticket_id
                WHERE ot.dining_session_id = ?
                  AND ot.status <> 'CANCELLED'
                  AND oi.status <> 'CANCELLED'
                """, BigDecimal.class, sessionId);
        return fromSubtotal(subtotal);
    }

    public Amount recalculateAndStore(DiningSessionEntity session) {
        Amount amount = calculate(session.getId());
        session.setSubtotal(amount.subtotal());
        session.setServiceFee(amount.serviceFee());
        session.setTotal(amount.total());
        notifier.notifyAfterCommit(session.getId());
        return amount;
    }
}
