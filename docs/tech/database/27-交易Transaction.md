# 交易 Transaction

**難度** ★★★☆☆　**用在哪些模組** M3、M5、M6、M7　**哪幾週** 第 2 週

## 一句話

交易就是「**這幾件事要嘛全部成功，要嘛全部當作沒發生**」。

## 想像一下

你要轉帳 1000 元給朋友。這件事其實是兩步：

1. 你的帳戶 −1000
2. 朋友的帳戶 +1000

如果第 1 步做完、第 2 步的時候系統當機——**那 1000 元就人間蒸發了**。

交易的意思是：把這兩步綁在一起。中間出任何問題，第 1 步也要**倒回去**，當作什麼都沒發生。

## 我們專案最重要的交易：送出點餐

送出一張點餐單，後端要做這些事：

```
① 鎖住這桌的 dining_session（SELECT ... FOR UPDATE），確認狀態還是 OPEN
② 檢查每個品項的必選選項有沒有選齊
③ 檢查鍋底（本桌還沒有鍋底時，這張單一定要有）
④ 逐項扣庫存
⑤ 建立 order_ticket
⑥ 建立每一筆 order_item
⑦ 建立每一筆 order_item_option
⑧ 更新 dining_session 的小計
⑨ 推 WebSocket 通知廚房
```

如果第 ④ 步扣到第三個品項時發現庫存不夠——**前兩個品項的庫存已經扣掉了**。

沒有交易的話：庫存憑空少了兩份，但訂單沒成立。**資料就錯了，而且沒人會發現。**

有交易的話：整個回滾，庫存回到原來的數字，回前端 409。**乾淨。**

## 怎麼用

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    @Transactional                    // ← 就這一行
    public OrderTicketDto submitOrder(String token, SubmitOrderRequest req) {
        // 這個方法裡的所有資料庫操作，要嘛全部成功，要嘛全部回滾
    }
}
```

**貼在 Service 的方法上。** 不要貼在 Controller，也不要貼在 Repository。

## 什麼時候會回滾

這是最容易搞錯的地方：

| 情況 | 會回滾嗎 |
|---|---|
| 丟出 `RuntimeException`（含我們的 `BusinessException`） | ✅ 會 |
| 丟出 `Error` | ✅ 會 |
| 丟出**檢查型例外**（像 `IOException`） | ❌ **不會！** |
| 方法正常結束 | ❌ 提交 |

如果你需要檢查型例外也回滾：

```java
@Transactional(rollbackFor = Exception.class)
```

**我們的做法**：所有業務錯誤都用 `BusinessException`（繼承 `RuntimeException`），這樣就不用煩惱。

## 唯讀交易

單純查詢的方法加上 `readOnly = true`：

```java
@Transactional(readOnly = true)
public List<MenuItemDto> findItems(Long categoryId) { ... }
```

好處：資料庫知道你不會改東西，可以最佳化；而且防止你不小心改到。

## ACID 是什麼

交易的四個保證，聽過就好：

| 字母 | 白話 |
|---|---|
| **A**tomicity 原子性 | 全部成功或全部失敗 |
| **C**onsistency 一致性 | 做完之後資料還是合法的（外鍵、約束都符合） |
| **I**solation 隔離性 | 你的交易做到一半，別人看不到中間狀態 |
| **D**urability 持久性 | 成功之後就算斷電也不會不見 |

## 15 分鐘動手小練習

1. 寫一個 Service 方法，裡面存兩筆資料，**中間故意丟一個 RuntimeException**：

```java
@Transactional
public void test() {
    repo.save(new Note("第一筆"));
    if (true) throw new RuntimeException("故意的");
    repo.save(new Note("第二筆"));
}
```

2. 呼叫它，然後去資料庫看——**第一筆應該也不在**
3. 把 `@Transactional` 拿掉，再跑一次——**第一筆會留下來**

這個對比讓你一輩子記得交易在做什麼。

## 你會遇到的坑

**① 同一個類別裡自己呼叫自己的 `@Transactional` 方法**

```java
@Service
public class OrderService {
    public void a() {
        b();                     // ❌ @Transactional 完全沒生效！
    }

    @Transactional
    public void b() { ... }
}
```

原因：Spring 是用代理（proxy）實作的，**內部呼叫不會經過代理**。
→ 把 `b()` 搬到另一個 Service，或從外面呼叫。**這個坑非常隱蔽，因為不會報錯，只是靜靜地沒有交易保護。**

**② 方法是 `private`**
代理蓋不住 private 方法，`@Transactional` 無效。**必須是 public。**

**③ 自己 try-catch 把例外吃掉**

```java
@Transactional
public void submit() {
    try {
        // ...
    } catch (Exception e) {
        log.error("錯誤", e);     // ❌ 吃掉了 → 不會回滾
    }
}
```

**④ 交易範圍太大**
把「呼叫外部 API」「發 email」「推 WebSocket」都放進交易裡。外部服務慢的時候，資料庫連線被佔住不放。
→ **只把資料庫操作放進交易。推 WebSocket 這種放在交易外面。**

**⑤ 交易裡面 sleep 或做長運算**
同上，會佔住連線。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `No EntityManager with actual transaction available` | 這個操作需要交易但沒有 | 方法上加 `@Transactional` |
| `Transaction silently rolled back` | 交易已被標記回滾，卻還想提交 | 內層丟了例外但被外層吃掉 |
| `Connection is read-only` | 在 `readOnly = true` 的交易裡想寫資料 | 拿掉 readOnly |
| `Lock wait timeout exceeded` | 等別人的鎖等太久 | 交易太長，或有死鎖，見 [鎖與併發](28-鎖與併發.md) |
| 資料明明存了卻不見 | 交易回滾了 | 看日誌有沒有例外被丟出來 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 全部成功或全部失敗 | 交易 Transaction |
| 倒回去 | rollback 回滾 |
| 確定寫進去 | commit 提交 |
| 四個保證 | ACID |
| 只讀不寫 | `readOnly` |
| Spring 在外面包一層 | proxy 代理 |

## 自我檢核

1. 送出點餐時，扣到一半庫存不夠，沒有交易會發生什麼事？
2. `@Transactional` 應該貼在哪一層？
3. 同一個類別裡 `a()` 呼叫 `@Transactional` 的 `b()`，交易會生效嗎？為什麼？
4. 推 WebSocket 通知應該放在交易裡面還是外面？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Spring Boot 零基礎入門 — 交易篇章](https://ithelp.ithome.com.tw/users/20151036/ironman/6130) | 繁中 | 中階 | 20 分 |
| [Spring 官方文件：Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction.html) | 英文 | 中階 | 查用 |

## 相關頁面

[鎖與併發](28-鎖與併發.md)　[ORM 與 JPA](25-ORM與JPA.md)　[三層架構](../backend/16-三層架構.md)
