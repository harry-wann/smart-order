package tw.ispan.smartorder.dto;

// S-10b 報到開桌：店員在對話框選的那張桌
public record SeatWaitlistRequest(Long tableId) {
}