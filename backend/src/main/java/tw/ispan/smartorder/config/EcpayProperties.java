package tw.ispan.smartorder.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ecpay")
public record EcpayProperties(
				String merchantId,
				String hashKey,
				String hashIv,
				String actionUrl,
				String returnUrl,
				String clientBackUrl
) {}
