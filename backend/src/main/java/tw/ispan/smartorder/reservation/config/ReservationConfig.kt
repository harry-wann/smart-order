package tw.ispan.smartorder.reservation.config

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.scheduling.annotation.EnableScheduling
import java.time.Clock

// @EnableScheduling 開在這裡，整個 app 的 @Scheduled 都靠它；沒開的話排程不會跑，也不會報錯
@Configuration
@EnableScheduling
@EnableConfigurationProperties(ReservationProperties::class)
class ReservationConfig {

    // 時間判斷都從這裡拿「現在」，不依賴伺服器時區。
    // 伺服器跑在 UTC 的話 LocalDateTime.now() 會差 8 小時，訂位期限、保留窗、NO_SHOW 全部會偏，
    // 所以 service 一律用 LocalDateTime.now(clock)，不直接呼叫 now()
    @Bean
    fun reservationClock(properties: ReservationProperties): Clock {
        return Clock.system(properties.zone)
    }
}
