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
) {
    public boolean available() {
        return present(merchantId) && present(hashKey) && present(hashIv)
                && "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5".equals(actionUrl)
                && present(returnUrl) && present(clientBackUrl);
    }

    private static boolean present(String value) {
        return value != null && !value.isBlank();
    }
}
