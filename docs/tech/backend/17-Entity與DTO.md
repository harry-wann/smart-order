# Entity 與 DTO

**難度** ★★★☆☆　**用在哪些模組** 所有後端工作　**哪幾週** 第 1 週（L0）、第 3 週

## 一句話

Entity 是**資料庫裡長什麼樣**，DTO 是**要給前端看什麼**。這兩個不該是同一個東西。

## 想像一下

你的員工資料在公司系統裡有：姓名、身分證字號、薪水、地址、緊急聯絡人、考績。

現在有人要一份「員工通訊錄」。你會直接把整份資料印出來給他嗎？

當然不會。你會挑：姓名、分機、email。**其他的不該給。**

- **Entity** = 公司系統裡的完整員工資料（對應資料庫的一張表）
- **DTO** = 你整理出來要給對方的那張通訊錄

## 我們專案的例子

**Entity —— 對應 `menu_item` 資料表**

```java
@Entity
@Table(name = "menu_item")
@Getter @Setter
public class MenuItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private MenuCategory category;          // ← 整個分類物件

    private String name;
    private BigDecimal price;
    private Boolean isSoupBase;
    private Boolean trackInventory;
    private Boolean active;                 // ← 前端不需要知道
    private LocalDateTime createdAt;        // ← 前端不需要知道
    private LocalDateTime updatedAt;        // ← 前端不需要知道
}
```

**DTO —— 給前端的菜單品項**

```java
public record MenuItemDto(
    Long id,
    String name,
    String description,
    BigDecimal price,
    String imageUrl,
    Long categoryId,          // 只給 id，不給整個分類物件
    Boolean soldOut,
    List<OptionGroupDto> optionGroups
) {}
```

## 四個不能直接回傳 Entity 的理由

**① 會洩漏不該給的東西**
`staff`（員工）表裡有 `passwordHash`。直接回傳 Entity，密碼雜湊就送到前端了。

**② 會噴 lazy loading 錯誤**
`MenuItem` 裡有 `category` 這個關聯。JPA 預設不會馬上載入它（lazy）。等到 Controller 要轉 JSON 時，交易已經結束，就會噴：

```
failed to lazily initialize a collection of role: ... could not initialize proxy
```

**這是新手第一週最常見的錯誤之一。**

**③ 會無限循環**
`MenuItem` 裡有 `category`，`MenuCategory` 裡有 `items` 的清單。轉 JSON 時：品項 → 分類 → 品項 → 分類 → ... `StackOverflowError`。

**④ 改資料庫就打壞前端**
哪天欄位改名，前端也跟著壞。有了 DTO，你可以改 Entity 但保持 DTO 不變。

## 三種 DTO

| 種類 | 用途 | 例子 |
|---|---|---|
| **Request DTO** | 前端送進來的 | `AddCartItemRequest` |
| **Response DTO** | 回給前端的 | `OrderTicketDto` |
| **內部 DTO** | Service 之間傳的（不常用） | — |

Request DTO 上要加驗證：

```java
// POST /api/dining-sessions/me/cart/items 加入購物車
public record AddCartItemRequest(
    @NotNull(message = "請選擇品項")
    Long menuItemId,

    @Min(value = 1, message = "數量至少為 1")
    @Max(value = 99, message = "數量最多 99")
    int quantity,

    List<Long> optionValueIds,

    @Size(max = 50, message = "備註最多 50 字")
    String note
) {}
```

Controller 加 `@Valid`，Spring 就會自動幫你檢查，不通過會回 400。

> 為什麼範例是「加入購物車」而不是「送出點餐」？因為我們的購物車存在後端、整桌共用，
> 品項是一項一項加進去的；送出點餐（`POST /api/dining-sessions/me/orders`）**不帶 body**，後端直接拿整桌購物車出單。
> 所以欄位驗證放在加入這一步；送出時後端還會用菜單現況再檢查一次（品項可能剛售完、選項可能剛改過）。

## 怎麼轉換

**手寫（我們用這個，最單純）**

```java
private MenuItemDto toDto(MenuItem entity) {
    return new MenuItemDto(
        entity.getId(),
        entity.getName(),
        entity.getDescription(),
        entity.getPrice(),
        entity.getImageUrl(),
        entity.getCategory().getId(),
        entity.getSoldOut(),
        toOptionGroupDtos(entity)
    );
}
```

看起來很囉唆，但**很好懂、不會有魔法、出錯好找**。對新手團隊來說這是對的選擇。（有套件叫 MapStruct 可以自動產生，但多一層學習成本，我們不用。）

**轉換要在 Service 裡做**，不要在 Controller。

## 為什麼用 record

Java 17 的 `record` 一行就定義一個不可變的資料類別，自動有建構子、getter、`equals`、`toString`。DTO 只是資料容器，用 record 最乾淨。

Entity 不能用 record（JPA 需要無參數建構子和 setter）。

## 15 分鐘動手小練習

1. 建一個簡單的 Entity（例如 `Note`：id、title、content、createdAt、secretKey）
2. 建一個對應的 DTO，**故意不要放 `secretKey`**
3. 寫一個 `toDto()` 方法
4. Controller 回傳 DTO
5. 打開 API 確認 `secretKey` 真的沒出現在回應裡

## 你會遇到的坑

**① 偷懶直接回 Entity**
「反正現在還好」——然後第三週開始噴 lazy loading，改起來要動十幾個地方。**一開始就做對。**

**② 用 `@JsonIgnore` 解決洩漏問題**
可以，但那是在 Entity 上貼補丁。DTO 才是正解。

**③ DTO 和 Entity 欄位名不一致**
前端拿到 `soldOut`，資料庫叫 `sold_out`，Entity 叫 `soldOut`——這是對的，**資料庫用底線、Java 和 JSON 用 camelCase**。

**④ 忘記加 `@Valid`**
DTO 上寫了一堆驗證註解，但 Controller 沒加 `@Valid`，等於沒寫。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `failed to lazily initialize` | Entity 離開交易後才讀關聯 | 在 Service 裡轉成 DTO |
| `Infinite recursion (StackOverflowError)` | 兩個 Entity 互相參照 | 用 DTO |
| `Cannot construct instance of ... no Creators` | Jackson 不知道怎麼建立這個物件 | Request DTO 用 record，或加無參數建構子 |
| `Validation failed for argument` | 欄位驗證沒過 | 這是正常的 400，看 details 裡哪個欄位錯 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 對應資料表的物件 | Entity（實體） |
| 給前端看的資料格式 | DTO（Data Transfer Object） |
| 前端送進來的 | Request DTO |
| 回給前端的 | Response DTO |
| 資料還沒真的載入 | lazy loading 延遲載入 |
| 自動檢查欄位 | Bean Validation（`@NotNull` 那些） |

## 自我檢核

1. 為什麼不能把 Entity 直接回傳給前端？（至少講兩個理由）
2. `failed to lazily initialize` 這個錯誤是怎麼來的？
3. Entity 轉 DTO 應該在哪一層做？
4. DTO 上寫了 `@NotNull` 卻沒生效，可能忘了什麼？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Spring Boot 零基礎入門 — DTO 相關篇章](https://ithelp.ithome.com.tw/users/20151036/ironman/6130) | 繁中 | 入門 | 15 分 |
| [Java Record 介紹（Oracle 官方）](https://docs.oracle.com/en/java/javase/17/language/records.html) | 英文 | 入門 | 10 分 |

## 相關頁面

[三層架構](16-三層架構.md)　[ORM 與 JPA](../database/25-ORM與JPA.md)　[JSON](../web/09-JSON.md)　[全域例外處理](18-全域例外處理.md)
