package tw.ispan.smartorder.dto;

import java.time.LocalDateTime;
import tw.ispan.smartorder.entity.DiningSessionEntity;
import tw.ispan.smartorder.entity.DiningTableEntity;
import tw.ispan.smartorder.reservation.dto.response.HeldForResponse;

public record TableOverviewResponse(
        Long tableId,
        String tableNo,
        Integer seats,
        String area,
        String status,
        String displayStatus,
        HeldForResponse heldFor,
        Integer adultCount,
        Integer childCount,
        LocalDateTime openedAt) {

    public static TableOverviewResponse from(
            DiningTableEntity table, DiningSessionEntity session, HeldForResponse heldFor) {
        HeldForResponse visibleHold = "AVAILABLE".equals(table.getStatus()) ? heldFor : null;
        return new TableOverviewResponse(
                table.getId(),
                table.getTableNo(),
                table.getSeats(),
                table.getArea(),
                table.getStatus(),
                visibleHold == null ? table.getStatus() : "RESERVED",
                visibleHold,
                session == null ? null : session.getAdultCount(),
                session == null ? null : session.getChildCount(),
                session == null ? null : session.getOpenedAt());
    }
}
