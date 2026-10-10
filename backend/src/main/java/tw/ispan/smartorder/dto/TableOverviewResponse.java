package tw.ispan.smartorder.dto;

import java.time.LocalDateTime;
import tw.ispan.smartorder.entity.DiningSession;
import tw.ispan.smartorder.entity.DiningTable;

public record TableOverviewResponse(
        Long tableId,
        String tableNo,
        Integer seats,
        String area,
        String status,
        String displayStatus,
        Integer adultCount,
        Integer childCount,
        LocalDateTime openedAt) {

    public static TableOverviewResponse from(DiningTable table, DiningSession session) {
        return new TableOverviewResponse(
                table.getId(),
                table.getTableNo(),
                table.getSeats(),
                table.getArea(),
                table.getStatus(),
                table.getStatus(), // 預約保留（RESERVED）等 harry 做好再接，先跟 status 一樣
                session == null ? null : session.getAdultCount(),
                session == null ? null : session.getChildCount(),
                session == null ? null : session.getOpenedAt());
    }
}