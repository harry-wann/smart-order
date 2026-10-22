package tw.ispan.smartorder.reservation.dto.response;

public record SlotResponse(String time, boolean available, int remainingTables) {
}
