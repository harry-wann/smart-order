# ORM 與 JPA

**難度** ★★★☆☆　**用在哪些模組** 所有後端工作　**哪幾週** 第 1 週

## 一句話

ORM 就是**幫你把 Java 物件和資料表自動對應起來**，讓你少寫很多 SQL。

## 想像一下

沒有 ORM 的時候，從資料庫拿一個品項要這樣：

```java
String sql = "SELECT id, name, price FROM menu_item WHERE id = ?";
PreparedStatement ps = conn.prepareStatement(sql);
ps.setLong(1, 12);
ResultSet rs = ps.executeQuery();
MenuItem item = new MenuItem();
if (rs.next()) {
    item.setId(rs.getLong("id"));
    item.setName(rs.getString("name"));
    item.setPrice(rs.getBigDecimal("price"));
}
rs.close(); ps.close(); conn.close();
```

十幾行，而且**每張表、每個查詢都要寫一次**。欄位加一個，所有地方都要改。

有了 ORM：

```java
MenuItem item = menuItemRepository.findById(12L).orElseThrow();
```

**一行。**

## 三個名詞的關係

新手最容易被這三個字搞混：

| 名詞 | 是什麼 | 比喻 |
|---|---|---|
| **JPA** | 一套**規格**（只定義「應該長怎樣」） | 插座的國家標準 |
| **Hibernate** | JPA 的**實作**（真的做事的那個） | 照標準做出來的插座 |
| **Spring Data JPA** | Spring 包在外面的**方便層** | 幫你把插座裝好在牆上 |

你寫的是 Spring Data JPA 的 API，底下跑的是 Hibernate，遵循的是 JPA 規格。**平常你只會碰到 Spring Data JPA。**

## Entity：把 Java 類別對應到資料表

```java
@Entity
@Table(name = "menu_item")
@Getter @Setter
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)   // AUTO_INCREMENT
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "is_soup_base")
    private Boolean isSoupBase;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
```

**命名對應規則**：Java 的 `isSoupBase` 會自動對到資料庫的 `is_soup_base`（駝峰轉底線），所以多數欄位不用寫 `@Column(name=...)`。

## Repository：神奇的地方

```java
public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    List<MenuItem> findByCategoryIdAndActiveTrue(Long categoryId);
    List<MenuItem> findByIsSoupBaseTrueAndActiveTrue();
    Optional<MenuItem> findByNameAndActiveTrue(String name);
}
```

**你只寫了 interface，沒有寫任何實作。** Spring 會在啟動時：

1. 讀你的方法名字
2. 拆解成 SQL
3. 自動產生實作類別

`findByCategoryIdAndActiveTrue` → `SELECT * FROM menu_item WHERE category_id = ? AND active = true`

繼承 `JpaRepository` 還免費送你：

```java
repo.save(item);              // 新增或更新
repo.findById(12L);           // 依 id 查
repo.findAll();               // 全部
repo.deleteById(12L);         // 刪除
repo.count();                 // 筆數
repo.findAll(pageable);       // 分頁
```

## 方法命名的規則

| 你寫 | 產生的 SQL 條件 |
|---|---|
| `findByName(String n)` | `WHERE name = ?` |
| `findByNameContaining(String n)` | `WHERE name LIKE %?%` |
| `findByPriceGreaterThan(BigDecimal p)` | `WHERE price > ?` |
| `findByActiveTrue()` | `WHERE active = true` |
| `findByCategoryIdOrderByPriceDesc(Long id)` | `WHERE category_id = ? ORDER BY price DESC` |
| `existsByPhone(String phone)` | 回傳 true/false |
| `countByStatus(String s)` | 回傳筆數 |

**方法名字太長的時候，就該改用 `@Query` 自己寫 SQL。**

## 複雜查詢自己寫

```java
@Query(value = """
    SELECT oi.menu_item_id, SUM(oi.quantity) AS total
    FROM order_item oi
    JOIN order_ticket ot ON oi.order_ticket_id = ot.id
    WHERE ot.placed_at >= :since AND oi.status <> 'CANCELLED'
    GROUP BY oi.menu_item_id
    ORDER BY total DESC
    LIMIT :limit
    """, nativeQuery = true)
List<Object[]> findPopularItems(@Param("since") LocalDateTime since,
                               @Param("limit") int limit);
```

**我們的原則**：簡單查詢用方法命名，推薦（進階 A7）／報表（進階 A4）／統計這種複雜的用 `nativeQuery`。不要為了「純 JPA」去硬湊 Criteria API。

## 15 分鐘動手小練習

1. 建一個 `Note` Entity（id、title、content、createdAt）
2. 建 `NoteRepository extends JpaRepository<Note, Long>`
3. 加一個方法 `List<Note> findByTitleContaining(String keyword);`
4. 在 Controller 裡用它
5. **打開 `application.yml` 加 `spring.jpa.show-sql: true`**，重跑，看 console 印出來的 SQL

第 5 步很重要——**看到 JPA 幫你產生的 SQL**，你就知道它在做什麼，不是魔法。

## 你會遇到的坑

**① N+1 問題（最經典）**

```java
List<MenuItem> items = repo.findAll();          // 1 次查詢
for (MenuItem item : items) {
    System.out.println(item.getCategory().getName());  // 每個再查 1 次！
}
```

100 個品項 = 101 次查詢。

→ 用 `@EntityGraph` 或 `JOIN FETCH` 一次抓完：
```java
@Query("SELECT m FROM MenuItem m JOIN FETCH m.category WHERE m.active = true")
List<MenuItem> findAllWithCategory();
```

**② `ddl-auto: update`**
JPA 會自己去改資料庫結構。看起來方便，但它**只會加不會減**，而且五個人的結構會慢慢分岔。
→ 我們用 `validate`，表結構交給 [Flyway](29-Flyway.md)。

**③ 把 Entity 直接回傳給前端**
見 [Entity 與 DTO](../backend/17-Entity與DTO.md)。

**④ 忘記 Entity 需要無參數建構子**
用 `@NoArgsConstructor` 或不要寫自訂建構子。

**⑤ 以為 ORM 讓你不用懂 SQL**
**剛好相反。** ORM 產生的 SQL 很爛的時候，你要看得出來。所以 `show-sql: true` 在開發時一定要開。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `No property 'xxx' found for type 'Y'` | Repository 方法名字對不到欄位 | 檢查拼字，欄位名要跟 Entity 一致 |
| `failed to lazily initialize` | 交易結束後才讀關聯 | 在 Service 裡轉 DTO，或用 JOIN FETCH |
| `Table 'xxx' doesn't exist` | 表還沒建 | Flyway 還沒跑，或表名對錯 |
| `Schema-validation: missing column` | Entity 有但資料庫沒有這個欄位 | 寫一支 Flyway migration 加上去 |
| `could not execute statement` | 底下的 SQL 失敗了 | 往下看 caused by，通常是約束違反 |
| `detached entity passed to persist` | 想 save 一個已經有 id 的物件 | 用 `save()` 而不是 `persist()` |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 物件和表自動對應 | ORM（Object-Relational Mapping） |
| 規格 | JPA |
| 真的做事的實作 | Hibernate |
| Spring 的方便層 | Spring Data JPA |
| 對應資料表的類別 | Entity |
| 存取資料的介面 | Repository |
| 一次查詢變成 101 次 | N+1 問題 |
| 延遲載入 | Lazy Loading |

## 自我檢核

1. JPA、Hibernate、Spring Data JPA 三者的關係？
2. 為什麼 Repository 只寫 interface 就能用？
3. N+1 問題是什麼？怎麼解？
4. 為什麼 `ddl-auto` 不能用 `update`？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Day12 Spring Boot — 什麼是 Spring Data JPA](https://ithelp.ithome.com.tw/articles/10194906) | 繁中 | 入門 | 15 分 |
| [[Day 13] 認識 Spring Data JPA, JPA, Hibernate](https://ithelp.ithome.com.tw/articles/10217348) | 繁中 | 入門 | 15 分 |
| [Hibernate 與 JPA 的關聯](https://ithelp.ithome.com.tw/m/articles/10330163) | 繁中 | 入門 | 10 分 |

## 相關頁面

[關聯式資料庫與 SQL](22-關聯式資料庫與SQL.md)　[JPA 關聯對應](26-JPA關聯對應.md)　[Entity 與 DTO](../backend/17-Entity與DTO.md)　[Flyway](29-Flyway.md)
