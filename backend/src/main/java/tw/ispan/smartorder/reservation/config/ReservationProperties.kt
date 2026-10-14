package tw.ispan.smartorder.reservation.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.temporal.ChronoUnit

@ConfigurationProperties(prefix = "reservation")
data class ReservationProperties(
    val diningMinutes: Long = 100,
    // 清桌緩衝，算進 end_time，重疊判斷就不用另外處理
    val bufferMinutes: Long = 15,
    // 預約保留從訂位前 30 分開始；客人線上取消的期限也是這一刻
    val holdBeforeMinutes: Long = 30,
    // 訂位只保留 10 分鐘，過了報到要擋
    val holdAfterMinutes: Long = 10,
    val bookableDays: Long = 30,
    val firstSlot: LocalTime = LocalTime.of(11, 30),
    val lastSlot: LocalTime = LocalTime.of(20, 0),
    val slotMinutes: Long = 30,
    val zone: ZoneId = ZoneId.of("Asia/Taipei"),
) {
    val occupyMinutes: Long
        get() = diningMinutes + bufferMinutes

    // 資料庫存的是店家時區的時間，回給前端時補上 +08:00
    fun toOffset(time: LocalDateTime): OffsetDateTime =
        time.truncatedTo(ChronoUnit.SECONDS).atZone(zone).toOffsetDateTime()
}
