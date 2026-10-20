package tw.ispan.smartorder.dto;

public record DiningInfoResponse(Long sessionId, String tableNo, Integer adultCount,
                                 Integer childCount, java.time.LocalDateTime openedAt) {
}
