package tw.ispan.smartorder.tabledetail.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SettleResponse(Long sessionId, String status, String method, BigDecimal total,
                             String tableNo, String tableStatus, LocalDateTime closedAt) {}
