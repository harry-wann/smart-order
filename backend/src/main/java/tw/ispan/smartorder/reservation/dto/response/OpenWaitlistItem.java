package tw.ispan.smartorder.reservation.dto.response;

public record OpenWaitlistItem(Long id, String no, String name, int partySize, long waitedMinutes, String status) {
}
