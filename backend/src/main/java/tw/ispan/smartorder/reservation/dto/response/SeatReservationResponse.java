package tw.ispan.smartorder.reservation.dto.response;

import java.util.List;

public record SeatReservationResponse(
        Long diningSessionId,
        String tableNo,
        int adultCount,
        int childCount,
        // 預先點餐轉單（進階 A2）用；沒有預點就是 null 與空陣列
        Long preorderTicketId,
        List<SoldOutItem> soldOut) {
}
