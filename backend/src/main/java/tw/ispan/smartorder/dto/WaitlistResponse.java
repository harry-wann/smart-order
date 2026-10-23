package tw.ispan.smartorder.dto;

import java.time.LocalDateTime;
import tw.ispan.smartorder.entity.WaitlistEntity;

public record WaitlistResponse(
        Long id,
        String ticketNo,
        String contactName,
        String contactPhone,
        Integer adultCount,
        Integer childCount,
        Integer partySize,
        String status,
        LocalDateTime createdAt,
        LocalDateTime calledAt,
        LocalDateTime seatedAt,
        LocalDateTime expiredAt) {

    public static WaitlistResponse from(WaitlistEntity w) {
        return new WaitlistResponse(
                w.getId(),
                w.getTicketNo(),
                w.getContactName(),
                w.getContactPhone(),
                w.getAdultCount(),
                w.getChildCount(),
                w.getPartySize(),
                w.getStatus(),
                w.getCreatedAt(),
                w.getCalledAt(),
                w.getSeatedAt(),
                w.getExpiredAt());
    }
}
