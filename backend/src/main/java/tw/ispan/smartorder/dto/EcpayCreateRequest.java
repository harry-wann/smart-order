package tw.ispan.smartorder.dto;

import java.math.BigDecimal;

public record EcpayCreateRequest(BigDecimal expectedTotal) {}
