package tw.ispan.smartorder.reservation.dto.response;

import java.time.OffsetDateTime;

public record OpenReservationItem(
        Long id,
        String reservationNo,
        String name,
        // 後端先遮好（0933***210），這份清單只讓櫃檯認人，不需要完整號碼
        String phoneMasked,
        OffsetDateTime startTime,
        int adultCount,
        int childCount,
        int partySize,
        int preorderItemCount,
        String assignedTableNo) {
}
