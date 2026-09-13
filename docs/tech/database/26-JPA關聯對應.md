# JPA 關聯對應

**難度** ★★★★☆　**用在哪些模組** M1、M3　**哪幾週** 第 2 週

## 一句話

把資料表之間的「外鍵」翻譯成 Java 物件之間的「互相持有」。

## 想像一下

資料庫裡，帳單只知道 `table_id = 3`，一個數字。

但在 Java 裡，你會希望寫 `session.getTable().getTableNo()` 直接拿到「A03」，而不是自己再去查一次桌位表。

**關聯對應就是在做這件翻譯。**

## 三種關聯

### 多對一（最常用）

「**多**張帳單對到**一**張桌子」：

```java
@Entity
public class DiningSession {
    @ManyToOne(fetch = FetchType.LAZY)      // 多個 session 對一個 table
    @JoinColumn(name = "table_id")          // 外鍵欄位
    private DiningTable table;
}
```

現在可以：`session.getTable().getTableNo()`

### 一對多

「**一**張帳單有**多**張點餐單」：

```java
@Entity
public class DiningSession {
    @OneToMany(mappedBy = "diningSession",     // 對方類別裡的欄位名
               cascade = CascadeType.ALL,       // 存帳單時連點餐單一起存
               orphanRemoval = true)            // 從清單移掉就刪掉
    @OrderBy("sequenceNo ASC")
    private List<OrderTicket> tickets = new ArrayList<>();
}
```

`mappedBy` 的意思是：「**外鍵不在我這邊，在對方的 `diningSession` 欄位上**」。

### 多對多

「一個品項可以有多個選項群組，一個選項群組也可以掛在多個品項上」。

**我們不用 `@ManyToMany`。** 因為中間表需要 `sort_order` 欄位，`@ManyToMany` 沒辦法放額外欄位。

改成**把中間表也做成一個 Entity**：

```java
@Entity
@Table(name = "menu_item_option_group")
public class MenuItemOptionGroup {
    @EmbeddedId
    private MenuItemOptionGroupId id;

    @ManyToOne @MapsId("menuItemId")
    private MenuItem menuItem;

    @ManyToOne @MapsId("optionGroupId")
    private OptionGroup optionGroup;

    private Integer sortOrder;
}
```

比較囉唆，但可控、好懂、不會有奇怪的行為。

## 最重要的一個字：LAZY

```java
@ManyToOne(fetch = FetchType.LAZY)    // ← 一定要寫這個
```

| 模式 | 意思 |
|---|---|
| `EAGER`（急切） | 抓帳單的時候，**順便把桌位也抓出來** |
| `LAZY`（延遲） | 只抓帳單。等你真的呼叫 `getTable()` 時才去查 |

**`@ManyToOne` 的預設是 `EAGER`，這是個陷阱。**

想像：你查 100 張帳單，每張都 EAGER 抓桌位、抓會員、抓預約……一次查詢變成幾百次。

**規則：所有關聯一律寫 `LAZY`。** `@OneToMany` 預設就是 LAZY，`@ManyToOne` 和 `@OneToOne` 要自己寫。

## 那 LAZY 的代價呢

LAZY 的東西如果在交易結束後才去讀，會噴：

```
failed to lazily initialize a collection of role: ...
could not initialize proxy - no Session
```

**這是新手前兩週最常見的錯誤。**

解法有三個：

**① 在 Service 裡（交易還活著的時候）就轉成 [DTO](../backend/17-Entity與DTO.md)** ← 我們用這個

```java
@Transactional(readOnly = true)
public MenuItemDto getItem(Long id) {
    MenuItem item = repo.findById(id).orElseThrow();
    return toDto(item);     // 在這裡讀關聯，交易還在
}
```

**② 需要關聯時用 JOIN FETCH 一次抓完**

```java
@Query("SELECT s FROM DiningSession s JOIN FETCH s.table WHERE s.id = :id")
Optional<DiningSession> findWithTable(@Param("id") Long id);
```

**③ `@EntityGraph`**

```java
@EntityGraph(attributePaths = {"table", "member"})
Optional<DiningSession> findById(Long id);
```

## 雙向關聯的陷阱

如果 A 有 B 的清單，B 也有 A 的參照，那叫雙向關聯。方便，但有兩個坑：

**① 轉 JSON 無限循環**
帳單 → 點餐單 → 帳單 → 點餐單 → … `StackOverflowError`
→ **用 DTO 就沒事。**

**② 兩邊要手動同步**

```java
public void addTicket(OrderTicket ticket) {
    tickets.add(ticket);
    ticket.setDiningSession(this);     // ← 這行不能忘
}
```

**我們的原則：能單向就單向。** 只在真的需要「從父抓子清單」的地方才做雙向（例如 `DiningSession → OrderTicket → OrderItem` 這條主線）。

## 我們專案的關聯總覽

| 從 | 到 | 關聯 | 方向 |
|---|---|---|---|
| `DiningSession` | `DiningTable` | `@ManyToOne(LAZY)` | 單向 |
| `DiningSession` | `Member` | `@ManyToOne(LAZY)`，**可為 null** | 單向 |
| `DiningSession` | `OrderTicket` | `@OneToMany(cascade=ALL)` | 雙向 |
| `OrderTicket` | `OrderItem` | `@OneToMany(cascade=ALL)` | 雙向 |
| `OrderItem` | `OrderItemOption` | `@OneToMany(cascade=ALL)` | 雙向 |
| `OrderItem` | `MenuItem` | `@ManyToOne(LAZY)` | 單向（只為統計） |
| `MenuItem` | `MenuCategory` | `@ManyToOne(LAZY)` | 單向 |
| `MenuItem` ↔ `OptionGroup` | 中間表 Entity | — | — |
| `MenuItem` | `InventoryItem` | `@OneToOne(LAZY)` | 單向 |

## 15 分鐘動手小練習

1. 建兩個 Entity：`Category`（id、name）和 `Item`（id、name、category）
2. `Item` 上加 `@ManyToOne(fetch = FetchType.LAZY)`
3. 開 `show-sql: true`
4. 在 Controller 直接回傳 `Item` Entity → **看它噴 lazy 錯誤**
5. 改成在 Service 裡轉 DTO → 正常了
6. 把 `LAZY` 改成 `EAGER`，看 console 的 SQL 多了什麼

**第 4 步那個錯誤你一定會遇到，先在練習專案遇到一次比較好。**

## 你會遇到的坑

**① 沒寫 LAZY**
`@ManyToOne` 預設 EAGER，查詢會偷偷變很多。

**② N+1 問題**
在迴圈裡讀 LAZY 關聯。

**③ 雙向關聯只設一邊**
存進去發現外鍵是 null。

**④ `cascade = ALL` 亂用**
你刪掉一張帳單，結果把桌位也刪了。
→ **cascade 只用在「父子」關係**（帳單→點餐單），不要用在「參照」關係（帳單→桌位）。

**⑤ 用 `@ManyToMany`**
中間表要加欄位時就死了。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `failed to lazily initialize` | 交易結束後才讀 LAZY 關聯 | 在 Service 轉 DTO，或 JOIN FETCH |
| `Infinite recursion / StackOverflowError` | 雙向關聯轉 JSON 循環 | 用 DTO |
| `object references an unsaved transient instance` | 存父物件時子物件還沒存 | 加 `cascade = CascadeType.ALL` |
| `deleted instance passed to merge` | 想更新一個已刪除的物件 | 檢查 `orphanRemoval` |
| `MultipleBagFetchException` | 一次 JOIN FETCH 兩個 List | 改用 `Set`，或分兩次查 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 多對一 | `@ManyToOne` |
| 一對多 | `@OneToMany` |
| 外鍵在對方那邊 | `mappedBy` |
| 連帶操作 | `cascade` |
| 移出清單就刪掉 | `orphanRemoval` |
| 用到才載入 | LAZY 延遲載入 |
| 一次抓出來 | EAGER / JOIN FETCH |

## 自我檢核

1. `@ManyToOne` 的預設載入模式是什麼？為什麼要改掉？
2. `failed to lazily initialize` 是什麼原因？三種解法各是什麼？
3. `cascade = ALL` 應該用在什麼關係上？不該用在什麼上？
4. 為什麼我們不用 `@ManyToMany`？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [[Day 13] 認識 Spring Data JPA, JPA, Hibernate](https://ithelp.ithome.com.tw/articles/10217348) | 繁中 | 入門 | 15 分 |
| [Day 13 Spring Boot & JPA](https://ithelp.ithome.com.tw/articles/10273243) | 繁中 | 中階 | 20 分 |

> **這是資料庫類最難的一頁。** 建議第 2 週真的開始寫關聯時再回來看第二遍。

## 相關頁面

[ORM 與 JPA](25-ORM與JPA.md)　[資料表設計](23-資料表設計.md)　[Entity 與 DTO](../backend/17-Entity與DTO.md)　[交易 Transaction](27-交易Transaction.md)
