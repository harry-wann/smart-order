# 關聯式資料庫與 SQL

**難度** ★★☆☆☆　**用在哪些模組** 所有後端工作　**哪幾週** 第 1 週

## 一句話

關聯式資料庫就是**一疊有格式的 Excel 表**，而 SQL 是你跟它說話的語言。

## 想像一下

火鍋店的紙本記錄，大概會有這幾本簿子：

- **菜單本**：每一頁一道菜，寫著名稱、價格
- **桌位表**：每一列一張桌子，寫著桌號、幾個位子
- **帳單本**：每一張帳單，寫著哪一桌、什麼時候開的、總共多少錢

資料庫就是把這些簿子數位化。**一本簿子 = 一張資料表，一頁／一列 = 一筆資料（row），欄位 = 直的那些格子。**

「**關聯式**」的意思是：這些簿子之間會互相指來指去。帳單上寫「A03 桌」，那個 A03 就指向桌位表裡的某一列。

## 四個基本動作

你們已經學過 SQL，這裡只是複習一下最常用的：

```sql
-- 查
SELECT id, name, price FROM menu_item WHERE category_id = 2 AND active = 1;

-- 新增
INSERT INTO menu_item (name, price, category_id) VALUES ('美國牛五花', 280, 2);

-- 修改
UPDATE menu_item SET price = 300 WHERE id = 12;

-- 刪除
DELETE FROM menu_item WHERE id = 12;
```

**最重要的提醒**：`UPDATE` 和 `DELETE` **一定要有 `WHERE`**。忘了寫的話，整張表都會被改掉或刪光。這件事每年都有人做。

## JOIN：把兩本簿子合起來看

這是新手最容易卡的地方，但概念很簡單。

**問題**：帳單上只寫「table_id = 3」，我想知道那是幾號桌。

```sql
SELECT s.id, s.total, t.table_no, t.seats
FROM dining_session s
JOIN dining_table t ON s.table_id = t.id
WHERE s.status = 'PAID';
```

翻譯成白話：

> 從帳單本（s）拿資料，**同時**去桌位表（t）裡找出 `t.id` 等於 `s.table_id` 的那一列，把兩邊的資料並排在一起。

| 種類 | 意思 |
|---|---|
| `JOIN`（= INNER JOIN） | **兩邊都有**才顯示 |
| `LEFT JOIN` | 左邊全部都要，右邊沒有就填 NULL |

**什麼時候用 LEFT JOIN？** 我們的 `dining_session.member_id` 可以是 NULL（匿名點餐）。如果你想列出所有帳單、順便帶出會員名字，就要用 `LEFT JOIN`——用 `JOIN` 的話匿名的帳單會全部不見。

## 聚合：算總數、算平均

```sql
-- 每個品項總共賣了幾份（人氣推薦就靠這個）
SELECT menu_item_id, SUM(quantity) AS total_qty
FROM order_item
WHERE status != 'CANCELLED'
GROUP BY menu_item_id
ORDER BY total_qty DESC
LIMIT 10;
```

`GROUP BY` 的意思是「**把同一類的擠在一起算**」。這裡就是「把同一個品項的所有訂購擠在一起，加總數量」。

**我們的「人氣推薦」功能，本質上就是這一句 SQL。** 不需要 AI、不需要機器學習。

## NULL 的陷阱

`NULL` 不是 0，也不是空字串，它是「**沒有值**」。

```sql
WHERE member_id = NULL      ❌ 永遠查不到東西
WHERE member_id IS NULL     ✅
```

這個坑幾乎每個人都會踩一次。

## 在我們的專案裡

你們大部分時間用 [JPA](25-ORM與JPA.md) 而不是手寫 SQL。但這幾種情況一定要自己寫：

- **人氣推薦**：`GROUP BY` + `SUM` + `ORDER BY`
- **防超賣扣庫存**：`UPDATE ... WHERE quantity >= ?`（見 [鎖與併發](28-鎖與併發.md)）
- **訂位的區間重疊檢查**（見 [區間重疊](../advanced/46-區間重疊與訂位排程.md)）
- **報表統計**（進階 A4）

## 15 分鐘動手小練習

用 Docker 起一個 MySQL（見 [Docker](../team/05-Docker與Compose.md)），用 MySQL Workbench 或 DBeaver 連上，然後：

```sql
CREATE TABLE 練習_品項 (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50),
  price DECIMAL(10,2)
);

INSERT INTO 練習_品項 (name, price) VALUES
  ('麻辣鍋底', 480), ('牛五花', 280), ('高麗菜', 80), ('王子麵', 30);

SELECT * FROM 練習_品項;
SELECT * FROM 練習_品項 WHERE price > 100;
SELECT AVG(price) FROM 練習_品項;
SELECT * FROM 練習_品項 ORDER BY price DESC LIMIT 2;
```

跑完這五句，你就有感覺了。

## 你會遇到的坑

**① `UPDATE` / `DELETE` 忘記 `WHERE`**
**寫的時候先寫 `WHERE`，再回頭補前面。** 或先用 `SELECT` 同樣的條件確認筆數。

**② 用 `=` 比較 NULL**
要用 `IS NULL` / `IS NOT NULL`。

**③ 用 FLOAT 存金額**
`0.1 + 0.2 != 0.3`。金額一律 `DECIMAL(10,2)`。

**④ 忘記設編碼**
中文變問號。建表時用 `utf8mb4` 和 `utf8mb4_unicode_ci`。

**⑤ 字串拼接 SQL**
```java
"SELECT * FROM member WHERE phone = '" + phone + "'"   // ❌ SQL 注入
```
一律用參數化查詢（`?` 或 `:name`）。用 JPA 的話它預設就是安全的。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Table 'xxx' doesn't exist` | 沒這張表 | 表名打錯，或 [Flyway](29-Flyway.md) 還沒跑 |
| `Unknown column 'xxx' in 'field list'` | 沒這個欄位 | 欄位名打錯 |
| `Duplicate entry 'xxx' for key` | 唯一鍵重複 | 要插入的值已經存在 |
| `Cannot add or update a child row: foreign key constraint fails` | 外鍵指向的資料不存在 | 先建父資料 |
| `Incorrect string value: '\xE7\x89\x9B...'` | 編碼問題 | 改成 `utf8mb4` |
| `Data too long for column` | 值太長 | 欄位長度不夠 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 一本簿子 | 資料表 table |
| 一頁／一列 | 一筆資料 row / record |
| 直的格子 | 欄位 column / field |
| 跟資料庫講話的語言 | SQL |
| 把兩本簿子合起來看 | JOIN |
| 同一類擠在一起算 | GROUP BY 聚合 |
| 沒有值 | NULL |

## 自我檢核

1. `UPDATE` 忘記寫 `WHERE` 會怎樣？
2. `JOIN` 和 `LEFT JOIN` 差在哪？我們哪個欄位需要 LEFT JOIN？
3. `WHERE member_id = NULL` 為什麼查不到東西？
4. 「人氣推薦」大致上是哪幾個 SQL 關鍵字組成的？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| 你們課程的 SQL 教材（複習就好） | 繁中 | — | — |
| [SQLBolt 互動式 SQL 練習](https://sqlbolt.com/) | 英文（但都是程式碼） | 入門 | 60 分 |
| [MySQL 官方中文手冊](https://dev.mysql.com/doc/refman/8.0/en/) | 英文 | 查用 | — |

## 相關頁面

[資料表設計](23-資料表設計.md)　[索引是什麼](24-索引.md)　[ORM 與 JPA](25-ORM與JPA.md)　[鎖與併發](28-鎖與併發.md)
