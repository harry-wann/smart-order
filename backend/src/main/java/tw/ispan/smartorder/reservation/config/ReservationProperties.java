package tw.ispan.smartorder.reservation.config;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

// 這裡的預設值跟 application.properties 的 reservation.* 一致，實際以 properties 為準
@ConfigurationProperties(prefix = "reservation")
@Getter
@Setter
@NoArgsConstructor
public class ReservationProperties {
    private long diningMinutes = 100;
    // 清桌緩衝，算進 end_time，重疊判斷就不用另外處理
    private long bufferMinutes = 15;
    // 預約保留從訂位前 30 分開始；客人線上取消的期限也是這一刻。
    // 最早可報到的時間、開桌清單的 +30 也用這個值，四個地方共用，不要各自寫死
    private long holdBeforeMinutes = 30;
    // 訂位只保留 10 分鐘，過了報到要擋。
    // 保留窗的結尾、NO_SHOW 的界線、開桌清單的 −10 也用這個值
    private long holdAfterMinutes = 10;
    private long bookableDays = 30;
    // 可訂的開始時間範圍：firstSlot 到 lastSlot（含），建立訂位接受這段內的任意分鐘（M7 7.1）。
    // lastSlot 是最晚能「開始」的時間，用餐超過它沒關係。
    // slotMinutes 只用在可訂時段查詢排「建議時段」（firstSlot 起每 slotMinutes 一格），不限制建立訂位
    private LocalTime firstSlot = LocalTime.of(11, 30);
    private LocalTime lastSlot = LocalTime.of(20, 0);
    private long slotMinutes = 30;
    private ZoneId zone = ZoneId.of("Asia/Taipei");
    // 訂位提醒（模擬簡訊）內容裡的店名
    private String storeName = "火鍋點餐系統";

    // 一筆訂位佔桌的總長 = 用餐 + 清桌（預設 115 分）。
    // end_time、重疊判斷的查詢範圍、開桌時 115 分鐘內有別筆訂位的提醒窗都用它
    public long getOccupyMinutes() {
        return diningMinutes + bufferMinutes;
    }

    // 資料庫存的是店家時區的時間，回給前端時補上 +08:00；秒以下的部分截掉
    public OffsetDateTime toOffset(LocalDateTime time) {
        return time.truncatedTo(ChronoUnit.SECONDS).atZone(zone).toOffsetDateTime();
    }
}
