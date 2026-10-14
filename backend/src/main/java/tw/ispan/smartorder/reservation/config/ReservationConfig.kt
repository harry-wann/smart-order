package tw.ispan.smartorder.reservation.config

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Clock

@Configuration
@EnableConfigurationProperties(ReservationProperties::class)
class ReservationConfig {

    // 時間判斷都從這裡拿「現在」，不依賴伺服器時區
    @Bean
    fun reservationClock(properties: ReservationProperties): Clock {
        return Clock.system(properties.zone)
    }
}
