package tw.ispan.smartorder.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

// 由品項推導點餐單的狀態（M4 4.5、M4 問題 1）。出菜看板（出餐、撤回、整單出完、報廢）
// 和取消品項（OrderCancellationService.cancelItem）共用這一份，單的狀態永遠等於品項狀態算出來的結果。
//   未取消的品項全部出完 → SERVED（推 TICKET_SERVED，KDS 卡片淡出）
//   出了一部分           → PREPARING
//   一樣都還沒出         → PENDING
//   全部取消或報廢       → CANCELLED（推 TICKET_CANCELLED）
//
// 呼叫前一定要已經鎖住這張單所屬的 dining_session（同一桌所有改單的交易都先排這把鎖），
// 所以這裡的讀取不用再加鎖；最後只更新 order_ticket 一列，鎖順序維持 session → … → order_ticket，不會反過來。
// 交易要用 READ_COMMITTED，才讀得到別人剛提交的品項狀態。
@Component
class OrderTicketStatusUpdater {

    // 單因為品項全部取消而推導成 CANCELLED、呼叫端又沒有帶原因時（例如整單出完時才發現品項都被取消了）用這句
    private static final String ALL_ITEMS_CANCELLED = "品項已全部取消";

    private final JdbcTemplate jdbc;
    private final KitchenNotificationService kitchenNotificationService;

    OrderTicketStatusUpdater(@Qualifier("smartOrderDataSource") DataSource dataSource,
                             KitchenNotificationService kitchenNotificationService) {
        this.jdbc = new JdbcTemplate(dataSource);
        this.kitchenNotificationService = kitchenNotificationService;
    }

    // 重算並寫回這張單的狀態；cancelReason 只在推導成 CANCELLED 時寫進 order_ticket.cancel_reason。
    // 狀態沒變就什麼都不做，也不推通知
    void refreshFromItems(Long ticketId, String cancelReason) {
        String currentStatus = jdbc.queryForObject(
                "SELECT status FROM order_ticket WHERE id = ?", String.class, ticketId);
        ItemCounts counts = jdbc.queryForObject("""
                SELECT COALESCE(SUM(status <> 'CANCELLED'), 0) AS active_count,
                       COALESCE(SUM(status = 'SERVED'), 0) AS served_count
                FROM order_item
                WHERE order_ticket_id = ?
                """, (rs, rowNum) -> new ItemCounts(rs.getInt("active_count"), rs.getInt("served_count")), ticketId);

        String derived;
        if (counts.active() == 0) {
            derived = "CANCELLED";
        } else if (counts.served() == counts.active()) {
            derived = "SERVED";
        } else if (counts.served() > 0) {
            derived = "PREPARING";
        } else {
            derived = "PENDING";
        }
        if (derived.equals(currentStatus)) {
            return;
        }

        if ("CANCELLED".equals(derived)) {
            String reason = cancelReason != null ? cancelReason : ALL_ITEMS_CANCELLED;
            jdbc.update("""
                    UPDATE order_ticket SET status = 'CANCELLED', cancel_reason = ?
                    WHERE id = ?
                    """, reason, ticketId);
            kitchenNotificationService.notifyTicketCancelledAfterCommit(ticketId, reason);
            return;
        }
        jdbc.update("UPDATE order_ticket SET status = ? WHERE id = ?", derived, ticketId);
        if ("SERVED".equals(derived)) {
            kitchenNotificationService.notifyTicketServedAfterCommit(ticketId);
        }
    }

    private record ItemCounts(int active, int served) {}
}
