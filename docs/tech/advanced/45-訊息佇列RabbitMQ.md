# 訊息佇列 RabbitMQ

**難度** ★★★★★　**用在哪些模組** 進階（M4 出單機列印佇列）　**哪幾週** 進階（基礎全綠燈後）

## 一句話

訊息佇列是**一個待辦事項的收件匣**：程式 A 把事情丟進去就回去忙別的，程式 B 自己慢慢拿出來做。

## 想像一下

火鍋店的出單機。

**沒有佇列**：客人送出點餐 → 系統直接叫印表機印 → 印表機**剛好卡紙**→ 整個送出點餐的動作失敗 → 客人的手機顯示錯誤，但其實訂單該成立的。

**有佇列**：客人送出點餐 → 訂單存進資料庫 → 把「印一張單」丟進收件匣 → **馬上回覆客人「已送出」** → 另一個程式從收件匣拿單子去印 → 印表機卡紙？沒關係，訊息還在收件匣裡，修好後自動補印。

## 三個價值

| 價值 | 白話 |
|---|---|
| **解耦** | 送出點餐不用等印表機、不用等通知寄完 |
| **削峰** | 尖峰時段一次湧入大量請求，佇列擋著慢慢消化 |
| **可靠重試** | 處理失敗可以重試，失敗太多次進「死信佇列」讓人來看 |

## 四個名詞

| 白話 | 正式名稱 |
|---|---|
| 丟東西進收件匣的人 | Producer 生產者 |
| 收件匣本身 | Queue 佇列 |
| 從收件匣拿出來做的人 | Consumer 消費者 |
| 決定信要放進哪個收件匣的分信員 | Exchange 交換機 |

## 誠實評估：你們需要嗎

**不太需要。**

你們的規模是一家店、十幾桌。上面講的四個場景（非同步通知、削峰、重試、多實例廣播），在 demo 規模下都不會真的塞車。

**所以 RabbitMQ 在這個專題是「為了學而加」，不是「不加不行」。** 這點要誠實面對，面試時被問到也要這樣講——**能說出「我知道這其實過度設計了，但我想學」比硬掰有說服力得多。**

## 如果要加，只做一個場景做深

**建議選：出單機列印佇列。**

理由：那是真實餐廳的痛點（卡紙、缺紙、離線），而且能完整走過訊息佇列的所有核心概念。比「我用 MQ 發通知」好講太多。

```java
// 生產者：送出點餐成功後
@Service
@RequiredArgsConstructor
public class OrderService {
    private final RabbitTemplate rabbit;

    public void submitOrder(...) {
        // ... 資料庫交易完成後 ...
        rabbit.convertAndSend("print.exchange", "print.ticket",
            new PrintJob(ticket.getId(), ticket.getTableNo()));
        // 不等印表機，馬上回覆客人
    }
}

// 消費者：另一個元件慢慢處理
@Component
@Slf4j
public class PrintConsumer {

    @RabbitListener(queues = "print.ticket.queue")
    public void handle(PrintJob job) {
        try {
            printerClient.print(job);           // 真的去印
            log.info("單號 {} 列印完成", job.ticketId());
        } catch (PrinterOfflineException e) {
            log.warn("印表機離線，訊息重回佇列：{}", job.ticketId());
            throw new AmqpRejectAndDontRequeueException(e);  // 進死信佇列
        }
    }
}
```

## 要做就要做完整

只寫上面那幾行只是「用過 RabbitMQ」。**做深的話要有這五件事**：

| 項目 | 為什麼 |
|---|---|
| **訊息持久化** | RabbitMQ 重開，還沒處理的訊息不能消失 |
| **手動 ack** | 處理成功才告訴佇列「這筆做完了」，中途當機會重送 |
| **重試機制** | 印表機暫時離線，等 30 秒再試，試 3 次 |
| **死信佇列（DLQ）** | 試 3 次還失敗的丟到另一個佇列，讓店長看到 |
| **冪等性** | 同一筆訊息被送兩次，不能印兩張單 → 用 ticketId 判斷是否已處理 |

**冪等性是最容易被忽略但最重要的一個。** 訊息佇列保證「至少送一次」，不保證「只送一次」。

## 怎麼裝

```yaml
# 未來要使用時才加入 backend/compose.yaml；目前專案沒有 rabbitmq 服務
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"      # 程式連這個
      - "15672:15672"    # 管理介面，瀏覽器打開 http://localhost:15672
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
```

**管理介面很值得一看**：你可以看到佇列裡現在有幾則訊息、誰在消費、有沒有堆積。demo 時打開它，視覺效果很好。

## 15 分鐘動手小練習

1. `docker compose up -d rabbitmq`
2. 打開 `http://localhost:15672`（guest / guest）
3. 在 Spring Boot 裡寫一個最小的生產者和消費者：

```java
@Configuration
public class RabbitConfig {
    @Bean Queue testQueue() { return new Queue("test.queue", true); }
}

@RestController
@RequiredArgsConstructor
class TestController {
    private final RabbitTemplate rabbit;
    @PostMapping("/api/test/send")
    public String send(@RequestParam String msg) {
        rabbit.convertAndSend("test.queue", msg);
        return "已丟進佇列";
    }
}

@Component @Slf4j
class TestConsumer {
    @RabbitListener(queues = "test.queue")
    public void receive(String msg) throws InterruptedException {
        Thread.sleep(3000);                  // 假裝處理很久
        log.info("收到：{}", msg);
    }
}
```

4. 連按十次送出 API — **每次都馬上回應**
5. **打開管理介面看佇列裡的訊息數字在跳**，然後 console 每 3 秒才印一則

**第 4、5 步就是「解耦」和「削峰」的具體體驗。**

## 你會遇到的坑

**① 沒有冪等性**
重送導致印兩張單、扣兩次庫存。

**② 訊息沒持久化**
RabbitMQ 重開，佇列裡的東西全沒了。

**③ 消費者丟例外導致無限重送**
訊息處理失敗 → 回佇列 → 再處理 → 又失敗 → 無限循環，CPU 100%。
→ **一定要設死信佇列和最大重試次數。**

**④ 在交易裡面發訊息**
交易還沒 commit 訊息就發出去，消費者去資料庫查卻查不到。
→ 交易提交後才發。

**⑤ 為了用而用**
在簡報上說「我們用了 RabbitMQ」但講不出為什麼需要，會扣分。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Connection refused: localhost:5672` | RabbitMQ 沒開 | `docker compose up -d rabbitmq` |
| `ACCESS_REFUSED - Login was refused` | 帳密錯 | 檢查設定 |
| `Listener method could not be invoked` | 訊息格式跟方法參數對不上 | 檢查序列化設定 |
| 訊息一直重送 | 沒設重試上限 | 設 DLQ 和 max-attempts |
| 佇列訊息一直堆積 | 消費者太慢或掛了 | 管理介面看 consumer 數量 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 收件匣 | Queue 佇列 |
| 丟東西的人 | Producer 生產者 |
| 拿出來做的人 | Consumer 消費者 |
| 分信員 | Exchange 交換機 |
| 做完了回報一聲 | ack 確認 |
| 一直失敗的信丟這裡 | 死信佇列 DLQ |
| 做兩次結果一樣 | 冪等性 Idempotency |

## 自我檢核

1. 訊息佇列的三個價值是什麼？
2. 出單機的例子裡，沒有佇列會發生什麼問題？
3. 什麼是冪等性？為什麼一定要處理？
4. 我們的專案「需要」RabbitMQ 嗎？面試被問到你會怎麼回答？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [RabbitMQ 官方教學（Java 版）](https://www.rabbitmq.com/tutorials) | 英文 | 中階 | 60 分 |
| [RabbitMQ 中文入門（菜鳥教程）](https://www.runoob.com/w3cnote/rabbitmq-intro.html) | 簡中 | 入門 | 20 分 |
| [Spring AMQP 官方文件](https://docs.spring.io/spring-amqp/reference/) | 英文 | 中階 | 查用 |

> **建議**：基礎功能全部綠燈、部署上線之後再碰這個。它是加分題，不是必修題。

## 相關頁面

[WebSocket 與 STOMP](../realtime/41-WebSocket與STOMP.md)　[Redis](../realtime/44-Redis.md)　[交易 Transaction](../database/27-交易Transaction.md)
