# 排程任務與 Cron

**難度** ★★☆☆☆　**用在哪些模組** M2、M5、M7、M8　**哪幾週** 第 3 週、第 5 週

## 一句話

排程就是**設一個鬧鐘，時間到了程式自己去做一件事**，不需要有人按按鈕。

## 想像一下

火鍋店裡有些事情「時間到了就該做」，沒有人會特地去點：

- 每分鐘看一下有沒有桌子用餐超過 100 分鐘，提醒櫃檯
- 叫號後 10 分鐘沒來報到，自動過號
- 訂位前 2 小時，發提醒
- 每天晚上 11:30，結算今天的營收
- 每天早上 6:00，算出今天建議備多少貨

這些都不是「使用者按了按鈕」觸發的，是**時間到了就該發生**。這就是排程。

## Spring 的做法

**第一步：開啟**

```java
@SpringBootApplication
@EnableScheduling              // ← 加這個
public class SmartOrderApplication { ... }
```

**第二步：寫任務**

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class DiningScheduler {

    private final DiningSessionService sessionService;

    @Scheduled(cron = "0 * * * * *", zone = "Asia/Taipei")   // 每分鐘的第 0 秒
    public void checkOvertimeTables() {
        try {
            int count = sessionService.markOvertimeSessions();
            if (count > 0) log.info("標記 {} 桌用餐超時", count);
        } catch (Exception e) {
            log.error("超時檢查失敗", e);        // ★ 不能讓例外往上丟
        }
    }
}
```

## Cron 表達式怎麼看

Spring 的 cron 有**六個欄位**（比 Linux 多一個「秒」）：

```
秒 分 時 日 月 星期
0  30 23 *  *  *      ← 每天 23:30:00
```

| 寫法 | 意思 |
|---|---|
| `0 * * * * *` | 每分鐘（第 0 秒） |
| `0 */5 * * * *` | 每 5 分鐘 |
| `0 0 * * * *` | 每小時整點 |
| `0 30 23 * * *` | 每天 23:30 |
| `0 0 6 * * *` | 每天早上 6:00 |
| `0 0 9 * * MON-FRI` | 週一到週五早上 9:00 |

`*` = 每個，`*/5` = 每 5 個，`-` = 範圍。

**不確定的時候用 [crontab.guru](https://crontab.guru/) 檢查**（它是 5 欄位的，把秒拿掉再貼進去）。

## 簡單的間隔寫法

不需要精確時間的話，用這個更直覺：

```java
@Scheduled(fixedDelay = 60000)        // 上一次「做完」後隔 60 秒再做
@Scheduled(fixedRate = 60000)         // 每 60 秒做一次（不管上次做完沒）
```

**建議用 `fixedDelay`**，因為 `fixedRate` 在任務跑太久時會重疊執行。

## 我們專案的九個排程

| 任務 | 頻率 | Cron | 做什麼 |
|---|---|---|---|
| 用餐超時掃描 | 每 1 分 | `0 * * * * *` | 超過 100 分鐘的桌推給櫃檯 |
| 候位過號標記 | 每 1 分 | `0 * * * * *` | 叫號後 10 分未到 → `EXPIRED` |
| 待清理提醒 | 每 5 分 | `0 */5 * * * *` | 待清理超過 15 分鐘 |
| NO_SHOW 標記 | 每 5 分 | `0 */5 * * * *` | 過時 10 分未報到（`CONFIRMED` 且開始時間早於現在 −10 分） |
| 訂位提醒 | 每 10 分 | `0 */10 * * * *` | 用餐前 2 小時發通知 |
| 驗證碼清理 | 每 10 分 | `0 */10 * * * *` | 刪過期的 |
| 低庫存檢查 | 每小時 | `0 0 * * * *` | 低於警戒值通知店長 |
| 營業日結算 | 每日 23:30 | `0 30 23 * * *` | 產生當日報表快照 |
| 明日備貨建議 | 每日 06:00 | `0 0 6 * * *` | 依訂位人數推估 |

> 原本還有第十支「桌位預留轉換」（M7 的 7.10），桌位不再跟訂位連動之後整條刪掉了，編號留空不重編，所以是九支。
> 九支裡的「低庫存檢查」屬進階 A3（M5 的 5.10）；「營業日結算」產生的是報表快照，報表畫面 S-12 屬進階 A4；「明日備貨建議」屬進階（M5 的 5.E2）。
> 這三支跟著進階功能走，基礎要交的是前六支。

> **排程不是即時的。** NO_SHOW 每 5 分鐘才跑一次，最慢會晚 5 分鐘才標上。所以開桌頁的預約清單、報到開桌 API 都要自己看時間：
> 超過用餐時間 10 分鐘就不列、報到時回 `409 RESERVATION_EXPIRED`（請改登記候位），不能只靠排程。

## 最重要的一個提醒：要能手動觸發

**你不可能在 demo 時等到晚上 11:30。**

每個排程任務都要配一支管理端 API：

```java
@RestController
@RequestMapping("/api/admin/scheduler")
@PreAuthorize("hasRole('MANAGER')")
@RequiredArgsConstructor
public class SchedulerAdminController {

    private final DiningSessionService sessionService;
    private final ReportService reportService;

    @Operation(summary = "手動觸發：用餐超時檢查")
    @PostMapping("/check-overtime")
    public Map<String, Object> checkOvertime() {
        return Map.of("marked", sessionService.markOvertimeSessions());
    }

    @Operation(summary = "手動觸發：營業日結算")
    @PostMapping("/daily-settlement")
    public Map<String, Object> settle(@RequestParam LocalDate date) {
        return Map.of("report", reportService.settle(date));
    }
}
```

**做法**：排程方法只負責「呼叫 Service 並記錄日誌」，真正的邏輯在 Service 裡。這樣排程和手動 API 共用同一段程式碼。

## 時區一定要設

```yaml
# application.yml
spring:
  jackson:
    time-zone: Asia/Taipei
```

```java
@Scheduled(cron = "0 30 23 * * *", zone = "Asia/Taipei")
```

不設的話，部署到國外的伺服器時，「晚上 11:30」會變成台灣時間早上 7:30。

## 15 分鐘動手小練習

```java
@Component
@Slf4j
public class TestScheduler {

    private int count = 0;

    @Scheduled(fixedDelay = 5000)
    public void everyFiveSeconds() {
        log.info("第 {} 次執行，現在時間 {}", ++count, LocalDateTime.now());
    }

    @Scheduled(cron = "0 * * * * *", zone = "Asia/Taipei")
    public void everyMinute() {
        log.info("整分鐘到了");
    }
}
```

1. 加上 `@EnableScheduling`，啟動
2. 看 console 每 5 秒印一次
3. 等到整分鐘，看第二個也印了
4. **在第一個方法裡故意 `throw new RuntimeException()`** → 看它之後還會不會繼續跑
5. 加上 try-catch，再試一次

**第 4 步很重要**：排程任務丟出例外的處理方式，跟你想的可能不一樣。

## 你會遇到的坑

**① 例外沒接住**
Spring 預設的排程器是**單執行緒**的。一個任務丟例外雖然不會停掉排程器，但如果任務卡住（例如查詢超慢），**其他所有排程任務都會被卡住**。
→ 每個任務自己 try-catch，並考慮設定執行緒池：

```java
@Bean
public TaskScheduler taskScheduler() {
    var s = new ThreadPoolTaskScheduler();
    s.setPoolSize(5);
    s.setThreadNamePrefix("sched-");
    return s;
}
```

**② 沒設時區**
部署後時間全跑掉。

**③ 多台伺服器重複執行**
部署兩台，每個排程都跑兩次——營收結算算兩遍。
→ 需要 **ShedLock**（用資料庫或 [Redis](44-Redis.md) 做鎖）。單台部署不用管，但要知道有這件事。

**④ 沒辦法 demo**
沒做手動觸發 API。

**⑤ 任務太重**
一個排程跑 30 秒，卡住整個排程器。
→ 批次處理、限制每次處理筆數。

**⑥ 忘記加 `@EnableScheduling`**
`@Scheduled` 完全沒反應，而且**不會報錯**。

## 常見錯誤訊息對照

| 症狀 | 原因 | 怎麼修 |
|---|---|---|
| 排程完全沒跑 | 忘了 `@EnableScheduling` | 加上 |
| 排程完全沒跑（2） | 類別沒貼 `@Component` | 加上 |
| `Encountered invalid @Scheduled method: cron expression must consist of 6 fields` | Cron 只寫了 5 欄 | Spring 要 6 欄（含秒） |
| 時間對不上 | 沒設時區 | 加 `zone = "Asia/Taipei"` |
| 跑一次之後就不跑了 | 任務卡住了 | 加 timeout、拆小 |
| 每次都執行兩遍 | 部署了兩個實例 | ShedLock |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 定時做一件事 | 排程 Scheduling |
| 時間規則字串 | Cron 表達式 |
| 上次做完隔多久 | `fixedDelay` |
| 固定頻率 | `fixedRate` |
| 多台伺服器只讓一台跑 | 分散式鎖 / ShedLock |

## 自我檢核

1. Spring 的 cron 有幾個欄位？比 Linux 多了什麼？
2. 為什麼每個排程都要配一支手動觸發的 API？
3. 排程任務裡的例外不接住會怎樣？
4. 部署兩台伺服器時，排程會發生什麼問題？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Spring Boot 排程教學（iThome 鐵人賽）](https://ithelp.ithome.com.tw/articles/10281461) | 繁中 | 入門 | 20 分 |
| [crontab.guru（Cron 檢查工具）](https://crontab.guru/) | 工具 | — | 隨時用 |
| [Spring 官方文件：Task Execution and Scheduling](https://docs.spring.io/spring-framework/reference/integration/scheduling.html) | 英文 | 中階 | 查用 |

## 相關頁面

[WebSocket 與 STOMP](41-WebSocket與STOMP.md)　[Redis](44-Redis.md)　[區間重疊與訂位排程](../advanced/46-區間重疊與訂位排程.md)
