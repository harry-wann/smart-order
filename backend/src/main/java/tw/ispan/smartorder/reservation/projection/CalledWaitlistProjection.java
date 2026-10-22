package tw.ispan.smartorder.reservation.projection;

import java.time.LocalDateTime;

public interface CalledWaitlistProjection {
    Long getId();

    String getTicketNo();

    String getContactName();

    Integer getPartySize();

    LocalDateTime getCreatedAt();
}
