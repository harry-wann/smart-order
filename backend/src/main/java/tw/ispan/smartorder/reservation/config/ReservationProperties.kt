package tw.ispan.smartorder.reservation.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.temporal.ChronoUnit

// 這裡的預設值跟 application.properties 的 reservation.* 一致，實際以 properties 為準
@ConfigurationProperties(prefix = "reservation")
data class ReservationProperties(
    val diningMinutes: Long = 100,
    // 清桌緩衝，算進 end_time，重疊判斷就不用另外處理
    val bufferMinutes: Long = 15,
    // 預約保留從訂位前 30 分開始；客人線上取消的期限也是這一刻。
    // 最早可報到的時間、開桌清單的 +30 也用這個值，四個地方共用，不要各自寫死
    val holdBeforeMinutes: Long = 30,
    // 訂位只保留 10 分鐘，過了報到要擋。
    // 保留窗的結尾、NO_SHOW 的界線、開桌清單的 −10 也用這個值
    val holdAfterMinutes: Long = 10,
    val bookableDays: Long = 30,
    // 可訂的開始時間：firstSlot 起每 slotMinutes 一格，到 lastSlot 為止（含）。
    // lastSlot 是最晚能「開始」的時間，用餐超過它沒關係
    val firstSlot: LocalTime = LocalTime.of(11, 30),
    val lastSlot: LocalTime = LocalTime.of(20, 0),
    val slotMinutes: Long = 30,
    val zone: ZoneId = ZoneId.of("Asia/Taipei"),
) {
    // 一筆訂位佔桌的總長 = 用餐 + 清桌（預設 115 分）。
    // end_time、重疊判斷的查詢範圍、開桌時 115 分鐘內有別筆訂位的提醒窗都用它
    val occupyMinutes: Long
        get() = diningMinutes + bufferMinutes

    // 資料庫存的是店家時區的時間，回給前端時補上 +08:00；秒以下的部分截掉
    fun toOffset(time: LocalDateTime): OffsetDateTime =
        time.truncatedTo(ChronoUnit.SECONDS).atZone(zone).toOffsetDateTime()
}
