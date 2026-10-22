package tw.ispan.smartorder.tabledetail.dto;

import java.time.LocalDateTime;

public record CancelSessionResponse(Long sessionId, String status, String tableNo,
                                    String tableStatus, LocalDateTime closedAt) {}
