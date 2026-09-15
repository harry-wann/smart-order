# Redis

**難度** ★★★☆☆　**用在哪些模組** M8，以及進階的快取與鎖　**哪幾週** 第 5 週

## 一句話

Redis 是**廚房門口那塊小白板**：寫東西超快、隨時可以擦掉、但**停電就沒了**。

## 想像一下

MySQL 像**檔案櫃**：資料寫在紙上、鎖在櫃子裡，安全、永久，但每次拿要開櫃子、翻資料夾——比較慢。

Redis 像**掛在牆上的小白板**：寫和看都是一瞬間，但**它在記憶體裡，伺服器重開就沒了**。

所以規則很清楚：

- **不能掉的東西**（訂單、會員、帳單）→ MySQL
- **掉了也還好、但要很快的東西**（驗證碼、快取）→ Redis

## 三個基本觀念

**① 它是「鍵值」儲存**

```
key                          value
"otp:0912345678"       →     "482913"
"rate:otp:0912345678"  →     "2"
"menu:items:all"       →     [一大包 JSON]
```

就像一本字典，用 key 查 value。**沒有表格、沒有 JOIN。**

**② 它可以設定「多久之後自動消失」（TTL）**

這是 Redis 最好用的功能：

```java
redisTemplate.opsForValue().set("otp:0912345678", "482913", Duration.ofMinutes(5));
// 5 分鐘後這筆資料自己消失，不用寫程式去刪
```

**驗證碼天生就需要這個。** 存在 MySQL 的話你還要寫一個排程去清過期的；存在 Redis 就自動消失。

**③ 它超快**

因為在記憶體裡，讀寫大約是 MySQL 的幾十到幾百倍快。

## 我們專案的四個用途

### ① 驗證碼（最自然的切入點）

```java
@Service
@RequiredArgsConstructor
public class OtpService {
    private final StringRedisTemplate redis;

    public String issue(String phone) {
        String code = String.format("%06d", new Random().nextInt(1000000));
        redis.opsForValue().set("otp:" + phone, code, Duration.ofMinutes(5));
        return code;      // 測試模式直接回傳
    }

    public boolean verify(String phone, String input) {
        String saved = redis.opsForValue().get("otp:" + phone);
        if (saved == null) return false;        // 過期了
        if (!saved.equals(input)) return false;
        redis.delete("otp:" + phone);           // 用過就刪
        return true;
    }
}
```

**比存 MySQL 乾淨很多**：不用建表、不用寫清理排程、自動過期。

### ② 菜單快取

菜單是「讀很多、寫很少」的典型：

```java
@Cacheable(value = "menu:items", key = "#categoryId")
public List<MenuItemDto> findItems(Long categoryId) { ... }

@CacheEvict(value = "menu:items", allEntries = true)     // 改菜單就清掉
public MenuItemDto updateItem(Long id, UpdateRequest req) { ... }
```

加兩個註解就好，Spring Cache 會自動處理。

**注意**：庫存變動導致的「售完」狀態如果也被快取，會出現「明明賣完了但客人還看得到」。
→ 售完狀態不要放快取，或改菜單時務必 evict。

### ③ 請求限流

防止有人一直狂點「取得驗證碼」：

```java
public void checkRateLimit(String phone) {
    String key = "rate:otp:" + phone;
    Long count = redis.opsForValue().increment(key);
    if (count == 1) redis.expire(key, Duration.ofMinutes(10));
    if (count > 3) throw new BusinessException("TOO_MANY_ATTEMPTS", "請 10 分鐘後再試", TOO_MANY_REQUESTS);
}
```

`increment` 是**原子操作**，不會有併發問題。

### ④ 分散式鎖（部署多台時才需要）

[防超賣](../database/28-鎖與併發.md) 我們用資料庫的條件式 UPDATE 就夠了。但如果要鎖的東西不在資料庫裡（例如「同一個手機號碼同時只能有一個訂位流程」），就需要分散式鎖：

```java
Boolean ok = redis.opsForValue()
    .setIfAbsent("lock:reserve:" + phone, "1", Duration.ofSeconds(10));
if (Boolean.FALSE.equals(ok)) {
    throw new BusinessException("PROCESSING", "處理中，請稍候", CONFLICT);
}
try {
    // ... 做事 ...
} finally {
    redis.delete("lock:reserve:" + phone);
}
```

`setIfAbsent` = 「如果不存在才設定」，這個動作是原子的，所以只有一個人會成功。

## 怎麼裝

`docker-compose.yml` 加：

```yaml
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

`pom.xml`：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

`application.yml`：

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
```

## 15 分鐘動手小練習

1. `docker compose up -d redis`
2. 進到 Redis 的命令列玩玩看：

```bash
docker compose exec redis redis-cli

SET greeting "歡迎光臨"
GET greeting
SET otp:0912345678 482913 EX 10      # 10 秒後過期
GET otp:0912345678
TTL otp:0912345678                    # 剩幾秒
# 等 10 秒
GET otp:0912345678                    # (nil) —— 自己不見了
INCR counter
INCR counter
GET counter                           # "2"
KEYS *                                # 看目前有什麼（正式環境不要用這個）
```

**`EX 10` 然後看它自己消失的那一刻，就是 Redis 最核心的價值。**

## 你會遇到的坑

**① 把重要資料放 Redis**
Redis 重開就沒了。訂單、帳單一律 MySQL。

**② 沒設 TTL**
key 越積越多，記憶體爆掉。**每一筆都該想「這要活多久」。**

**③ 快取沒清**
改了菜單但快取還是舊的，客人看到舊價格。

**④ 在正式環境用 `KEYS *`**
它會掃描全部 key，資料量大時會卡住整個 Redis。用 `SCAN`。

**⑤ 以為 Redis 能取代資料庫**
它們解決不同的問題。

**⑥ 為了用而用**
單台部署、資料量小的時候，Redis 對效能沒有可感知的幫助。
→ **從「驗證碼 + 限流」開始**，這兩個是真的有價值的，不是為了炫技。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Unable to connect to Redis` | 連不上 | `docker compose ps` 確認有在跑 |
| `RedisConnectionFailureException` | 同上 | 檢查 host / port 設定 |
| `Cannot serialize` | 物件沒實作 Serializable | 用 JSON 序列化器，或存字串 |
| 快取資料是亂碼 | 預設用 JDK 序列化 | 設定 `GenericJackson2JsonRedisSerializer` |
| 資料莫名消失 | TTL 到了 | 正常，檢查 TTL 設多久 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 記憶體裡的小白板 | Redis / In-memory Data Store |
| 用鑰匙找東西 | Key-Value Store |
| 多久後自動消失 | TTL（Time To Live） |
| 先查快取再查資料庫 | Cache-Aside |
| 清掉快取 | Cache Eviction |
| 不存在才設定 | `SETNX` / `setIfAbsent` |
| 多台伺服器共用的鎖 | 分散式鎖 |

## 自我檢核

1. 什麼東西適合放 Redis？什麼不適合？
2. TTL 是什麼？為什麼驗證碼特別適合用 Redis？
3. 改了菜單之後，快取要做什麼？
4. `setIfAbsent` 為什麼可以拿來做鎖？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Redis 官方教學（互動式）](https://redis.io/learn) | 英文 | 入門 | 30 分 |
| [Redis 中文入門（菜鳥教程）](https://www.runoob.com/redis/redis-tutorial.html) | 簡中 | 入門 | 30 分 |
| [Spring Data Redis 官方文件](https://docs.spring.io/spring-data/redis/reference/) | 英文 | 中階 | 查用 |

## 相關頁面

[鎖與併發](../database/28-鎖與併發.md)　[排程任務與 Cron](43-排程與Cron.md)　[Docker 與 Docker Compose](../team/05-Docker與Compose.md)　[JWT 與登入狀態](../backend/21-JWT.md)
