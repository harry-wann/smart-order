package tw.ispan.smartorder.dto;

public record RegisterWaitlistRequest(String contactName, String contactPhone, Integer partySize) {
}