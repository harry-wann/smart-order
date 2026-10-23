package tw.ispan.smartorder.reservation.dto.response;

import java.time.OffsetDateTime;
import tw.ispan.smartorder.reservation.enums.CancelSource;
import tw.ispan.smartorder.reservation.enums.ReservationStatus;

public record AdminReservationResponse(
        Long reservationId,
        String reservationNo,
        OffsetDateTime startTime,
        // 已經含清桌緩衝，不是客人實際吃完的時間
        OffsetDateTime endTime,
        String contactName,
        // 這份清單回完整號碼，要不要遮由畫面決定；開桌頁那份清單（OpenReservationItem）則是後端先遮好
        String contactPhone,
        boolean member,
        int adultCount,
        int childCount,
        int partySize,
        // 訂位當下配到的桌；取消後是 null
        String assignedTableNo,
        // 報到後實際坐的桌，可能跟配到的不一樣
        String seatedTableNo,
        ReservationStatus status,
        // 現在是否在保留窗內（決定「保留 A08」小字）
        boolean holding,
        // 可報到的時間窗：訂位前 30 分到後 10 分。前端拿來決定報到鈕要不要停用，
        // 後端報到時會再擋一次（RESERVATION_TOO_EARLY／EXPIRED）
        OffsetDateTime checkInFrom,
        OffsetDateTime checkInUntil,
        CancelSource cancelSource,
        OffsetDateTime cancelledAt,
        String cancelledByStaffName,
        // 預先點餐是進階功能，還沒做，目前固定 0；欄位先留著，之後前端不用改
        int preorderItemCount,
        // 訂位提醒（模擬簡訊）送出的時間；還沒提醒是 null。後面新增的欄位，前面的欄位都沒變
        OffsetDateTime reminderSentAt) {
}
