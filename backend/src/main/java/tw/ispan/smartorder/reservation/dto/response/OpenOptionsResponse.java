package tw.ispan.smartorder.reservation.dto.response;

import java.time.OffsetDateTime;
import java.util.List;

// S-02 點空桌進開桌頁要的資料；全部是即時查詢，不存任何狀態
public record OpenOptionsResponse(
        Long tableId,
        String tableNo,
        Integer seats,
        String area,
        String status,
        // 已叫號、等著入座的候位（候位的開桌流程在 S-02c）
        List<OpenWaitlistItem> waitlist,
        // 用餐時間在現在 −10 ～ +30 分、坐得下這張桌的訂位；不限定原本配到哪張桌
        List<OpenReservationItem> reservations,
        // 這張桌現在保留給哪一筆
        HeldForResponse heldFor,
        // 這張桌 115 分鐘內要開始的別筆訂位，只提醒不擋
        UpcomingReservationResponse upcomingOnThisTable) {
}
