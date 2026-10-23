package tw.ispan.smartorder.dto;

import java.util.Map;

public record EcpayCheckoutResponse(
        String action,
        Map<String, String> params
) {}
