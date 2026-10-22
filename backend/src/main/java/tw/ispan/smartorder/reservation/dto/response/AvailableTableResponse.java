package tw.ispan.smartorder.reservation.dto.response;

public record AvailableTableResponse(
        Long tableId,
        String tableNo,
        String area,
        Integer seats,
        // 115 分鐘內別筆訂位的開始時間（HH:mm），只提醒不擋
        String upcomingReservationAt,
        // 從 S-07 報到時，這筆訂位自己的保留桌
        boolean isOwnHold) {
}
