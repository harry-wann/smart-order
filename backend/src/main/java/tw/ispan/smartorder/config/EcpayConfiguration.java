package tw.ispan.smartorder.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(EcpayProperties.class)
public class EcpayConfiguration {
}
