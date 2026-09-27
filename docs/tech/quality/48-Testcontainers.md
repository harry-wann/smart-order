# Testcontainers

**難度** ★★★★☆　**用在哪些模組** M3、M5、M7　**哪幾週** 第 5 週

> 本頁是未來火鍋店正式功能的整合測試規劃，示例中的 `MenuItem`、庫存服務與 migration 尚未在目前 Northwind 練習專案建立。目前 `backend/` 使用 MySQL 5.7，且 Flyway 暫停；不要直接複製下方測試到現有專案。

## 一句話

Testcontainers 讓你的測試**用真的 MySQL 跑**，而不是拿一個假的資料庫來湊。

## 想像一下

你要測「庫存扣減會不會超賣」。這個測試需要真的資料庫，因為重點就在**資料庫的鎖行為**。

過去的做法是用 **H2**（一個記憶體資料庫，快、輕）。問題是：

| H2 | MySQL |
|---|---|
| 沒有 `SELECT ... FOR UPDATE` 的完整行為 | 有 |
| SQL 語法有差異 | — |
| 資料型別行為不同 | — |
| **測試過了，上線還是爆** | — |

**用 H2 測「防超賣」等於沒測。**

Testcontainers 的做法：**測試開始時自動用 Docker 起一個真的 MySQL，測完自動關掉。**

## 怎麼用

`pom.xml`：

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>mysql</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-testcontainers</artifactId>
    <scope>test</scope>
</dependency>
```

寫一個共用的基底類別：

```java
@SpringBootTest
@Testcontainers
public abstract class IntegrationTestBase {

    @Container
    @ServiceConnection                              // 讓 Spring 使用測試容器連線
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:5.7.44")
            .withDatabaseName("smart_order_test");
}
```

**就這樣。** `@ServiceConnection` 會自動把 `spring.datasource.url` 之類的設定指向那個容器。

未來正式功能啟用 [Flyway](../database/29-Flyway.md) 並加入 migration 後，才能讓測試容器自動建立相同表結構。目前 Northwind 練習尚未啟用 Flyway，因此這段是規劃示例，不是可直接執行的測試基底類別。

## 真正值得寫的測試

```java
class InventoryConcurrencyTest extends IntegrationTestBase {

    @Autowired OrderService orderService;
    @Autowired InventoryRepository inventoryRepo;

    @Test
    void 十桌同時搶最後一份不應超賣() throws Exception {
        Long itemId = seedItemWithStock(1);                          // 庫存 = 1
        List<String> tokens = seedTablesWithCart(10, itemId, 1);     // 開 10 桌，每桌購物車放 1 份（同桌客人的裝置代號是 device-test）

        ExecutorService pool = Executors.newFixedThreadPool(10);
        CountDownLatch latch = new CountDownLatch(10);
        AtomicInteger success = new AtomicInteger();

        for (String token : tokens) {
            pool.submit(() -> {
                try { orderService.submitOrder(token, "device-test"); success.incrementAndGet(); }
                catch (BusinessException ignored) { }
                finally { latch.countDown(); }
            });
        }
        latch.await(10, TimeUnit.SECONDS);

        assertThat(success.get()).isEqualTo(1);
        assertThat(inventoryRepo.findQuantity(itemId)).isZero();
    }
}
```

**這個測試在 H2 上可能會過，但在真的 MySQL 上才有意義。**

同理，這幾個也該用 Testcontainers 測：

| 測試 | 為什麼需要真資料庫 |
|---|---|
| 防超賣 | 要測資料庫的列鎖行為 |
| 同桌兩人同時送出整桌購物車 | 要測 `FOR UPDATE` 真的讓兩筆排隊：一個成功、一個 `CART_EMPTY`、只有一張單 |
| 訂位重疊 + 唯一約束 | 要測 UNIQUE INDEX 真的擋得住 |
| 悲觀鎖開桌 | `SELECT ... FOR UPDATE` |
| 訂位保留窗（顯示「預約保留」） | `INTERVAL` 的日期運算要在 MySQL 上跑才準 |
| Flyway migration | 確認 migration 真的跑得起來 |
| 複雜的 native query | 語法要 MySQL 才驗證得了 |

## 測試怎麼分層

| 層 | 用什麼 | 幾個 | 跑多快 |
|---|---|---|---|
| **單元測試** | JUnit + Mockito，不碰資料庫 | 15～20 | 毫秒 |
| **整合測試** | Testcontainers | 5～8 | 每個幾秒 |

**大部分測試應該是單元測試**（快），整合測試只留給「真的需要資料庫」的那幾個。

## 15 分鐘動手小練習

1. 確認 Docker Desktop 有開
2. 加上 Testcontainers 的依賴
3. 寫一個最小的整合測試：

```java
@SpringBootTest
@Testcontainers
class SimpleIntegrationTest {

    @Container
    @ServiceConnection
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:5.7.44");

    @Autowired MenuItemRepository repo;

    @Test
    void 可以存進去也查得出來() {
        MenuItem item = new MenuItem();
        item.setName("測試鍋底");
        item.setPrice(new BigDecimal("480.00"));
        repo.save(item);

        assertThat(repo.findAll()).hasSize(1);
    }
}
```

4. 跑它 —— **第一次會很久**（要下載 MySQL 映像檔）
5. 跑的時候另開一個終端機打 `docker ps`，你會看到一個臨時的 MySQL 容器
6. 測完再打一次 `docker ps`，容器不見了

第 5、6 步就是 Testcontainers 的全部魔法。

## 你會遇到的坑

**① Docker 沒開**
測試會直接失敗。

**② 第一次超慢**
要下載映像檔（幾百 MB）。之後有快取就快了。
→ **不要在第 6 週第一次跑**，第 5 週就要跑通。

**③ CI 上跑不動**
GitHub Actions 的 runner 有 Docker，可以跑，但會比較慢。
→ 可以在 CI 上只跑單元測試，整合測試本機跑。看時間決定。

**④ 每個測試類別都開一個新容器**
先確認測試正確且資料互不干擾，再評估共用容器是否能節省時間。不要為了加速讓前一個測試的資料流到下一個測試。

**⑤ 測試之間資料互相污染**
上一個測試塞的資料還在。
→ 用 `@Transactional`（測試結束自動回滾），或 `@Sql` 每次清空。

**⑥ 測試太多都用整合測試**
跑一次要五分鐘，沒有人會想跑。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Could not find a valid Docker environment` | Docker 沒開 | 開 Docker Desktop |
| `Container startup failed` | 容器起不來 | 看容器日誌，多半是映像檔版本問題 |
| `Timed out waiting for container` | 啟動太久 | 網路慢，或機器資源不足 |
| `Table doesn't exist` | Flyway 沒跑 | 檢查 migration 路徑設定 |
| 測試互相影響 | 資料沒清 | 加 `@Transactional` |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 測試時自動起的真資料庫 | Testcontainers |
| 記憶體假資料庫 | H2 |
| 測整條路 | 整合測試 |
| 自動接上連線設定 | `@ServiceConnection` |
| 容器結束後清理 | 由 Testcontainers 管理容器生命週期 |

## 自我檢核

1. 為什麼「防超賣」不能用 H2 測？
2. Testcontainers 在測試開始和結束時各做了什麼？
3. 單元測試和整合測試各該有幾個？為什麼？
4. 第一次跑為什麼特別慢？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Testcontainers 官方 Java 快速入門](https://testcontainers.com/guides/getting-started-with-testcontainers-for-java/) | 英文 | 中階 | 30 分 |
| [Spring Boot 官方：Testcontainers 支援](https://docs.spring.io/spring-boot/reference/testing/testcontainers.html) | 英文 | 中階 | 20 分 |

## 相關頁面

[單元測試](47-單元測試.md)　[鎖與併發](../database/28-鎖與併發.md)　[Docker 與 Docker Compose](../team/05-Docker與Compose.md)　[Flyway](../database/29-Flyway.md)
