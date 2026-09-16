# Flyway 資料庫版本控管

**難度** ★★☆☆☆　**用在哪些模組** 技術地基 L0　**哪幾週** 第 1 週（L0）

## 一句話

Flyway 是**資料庫的 Git**：每次改表都寫成一支檔案，誰 pull 下來都會自動升級到同一個版本。

## 想像一下

沒有 Flyway 的情況：

> **A**：我加了一個 `service_call` 表，大家記得自己加喔
> **B**：欄位是什麼？
> **A**：我截圖給你
> **C**：我加了但忘記加索引
> **D**：我的程式一直說找不到欄位
> **E**：我的資料庫是三天前的版本

**五個人的資料庫結構全都不一樣。** 而且沒有人知道現在「正確的版本」到底是什麼。

Flyway 的做法：**所有表結構的改動，都寫成一支帶編號的 SQL 檔案，放進專案裡跟著 Git 走。**

程式啟動時，Flyway 會看資料庫目前跑到第幾版，然後把還沒跑的往下跑完。

## 長什麼樣

```
backend/src/main/resources/db/migration/
├── V1__create_account_tables.sql
├── V2__create_menu_tables.sql
├── V3__create_dining_tables.sql
├── V4__create_inventory_tables.sql
├── V5__create_payment_tables.sql
├── V6__create_reservation_tables.sql
├── V7__create_service_and_waitlist.sql
└── V8__create_member_benefit_tables.sql    ← 進階 A6（點數與優惠券）
```

（每一支建哪幾張表，見 [03-資料庫設計](../../spec/03-資料庫設計.md) 的「Flyway 檔案規劃」。）

檔名規則：`V` + 版本號 + `__`（**兩個底線**）+ 描述 + `.sql`

檔案內容就是純 SQL：

```sql
-- V7__create_service_and_waitlist.sql
CREATE TABLE service_call (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dining_session_id BIGINT UNSIGNED NOT NULL,
  table_id          BIGINT UNSIGNED NOT NULL,
  type              VARCHAR(20) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  acknowledged_at   DATETIME(3) NULL,
  staff_id          BIGINT UNSIGNED NULL,
  CONSTRAINT fk_service_call_session FOREIGN KEY (dining_session_id) REFERENCES dining_session(id),
  INDEX idx_service_call_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 最重要的一條規則

> **已經合併進 develop 的 migration 檔案，永遠不能修改。**

因為別人的資料庫已經跑過那支了。你改了內容，Flyway 會發現「checksum 對不上」然後拒絕啟動。

**要改？寫一支新的 V9。** 這跟 Git 一樣——你不會去改已經 push 出去的 commit。

## 怎麼設定

`pom.xml`：

```xml
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-mysql</artifactId>
</dependency>
```

`application.yml`：

```yaml
spring:
  flyway:
    enabled: true
    baseline-on-migrate: true
  jpa:
    hibernate:
      ddl-auto: validate      # ← 重點：JPA 只檢查，不准它改表
```

**`ddl-auto: validate` 是關鍵。** 意思是「JPA 你只要檢查 Entity 跟資料表對不對得上就好，**不准自己去改**」。改表的權力完全交給 Flyway。

## 日常流程

**A（唯一能寫 migration 的人）要加一個欄位：**

1. 新增 `V9__add_is_refill_to_menu_item.sql`
2. 寫 `ALTER TABLE menu_item ADD COLUMN is_refill TINYINT(1) NOT NULL DEFAULT 0;`
3. 同時更新 `MenuItem` Entity 加上對應欄位
4. 本機跑起來確認沒問題
5. 發 PR，標題加 `[BREAKING]`，在群組 @所有人

**其他人：**

1. `git pull`
2. **重啟後端** ← 就這樣，Flyway 自動幫你升級

不用手動跑 SQL、不用問 A 要截圖。

## 種子資料要不要用 Flyway

**表結構**用 Flyway（`V` 開頭）。

**種子假資料**建議分開：

```
db/migration/          ← V1, V2, ... 表結構，所有環境都跑
db/seed/               ← 開發用的假資料，用 CommandLineRunner + @Profile("local") 載入
```

理由：正式環境不該有假訂單。

或者用 Flyway 的 `R__` 前綴（repeatable，內容變了就重跑），但我們的種子資料有 5000 筆歷史單品，用程式產生比較實際。

## 15 分鐘動手小練習

1. 在練習專案加上 flyway-core + flyway-mysql
2. 建 `src/main/resources/db/migration/V1__create_note.sql`：

```sql
CREATE TABLE note (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

3. 啟動，看 console 印出 Flyway 的 migration 訊息
4. 去資料庫看，**多了一張 `flyway_schema_history` 表**——那是 Flyway 的紀錄本
5. 建 `V2__add_content_to_note.sql` 加一個欄位，重啟
6. **故意去改 V1 的內容，重啟** → 看它怎麼拒絕你

第 6 步很重要，親眼看過那個錯誤，以後就不會犯。

## 你會遇到的坑

**① 改了已經跑過的 migration**
```
Migration checksum mismatch for migration version 1
```
→ 本機開發時可以 `docker compose down -v` 砍掉資料庫重來。**已經 push 出去的絕對不要改。**

**② 檔名格式錯**
`V1_create_note.sql`（只有一個底線）→ Flyway 不認得。**要兩個底線。**

**③ 版本號重複**
兩個人同時寫了 `V9`。
→ 所以 migration **只有 A 能寫**。

**④ `ddl-auto` 還留著 `update`**
JPA 和 Flyway 打架，結構會亂掉。

**⑤ migration 裡寫了會失敗的 SQL**
失敗之後 Flyway 會卡在那一版，後面的都不跑。
→ 本機一定要先跑過一次。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Migration checksum mismatch` | 有人改了跑過的檔案 | 還原那個檔案，或本機砍掉資料庫重來 |
| `Found non-empty schema without schema history table` | 資料庫已有表但沒 Flyway 紀錄 | 設 `baseline-on-migrate: true` |
| `Detected failed migration to version X` | 某一版跑失敗卡住了 | 修好 SQL，清掉 `flyway_schema_history` 那一列，重跑 |
| `Schema-validation: missing column [xxx]` | Entity 有欄位但表沒有 | 寫一支新 migration 加上去 |
| `Schema-validation: wrong column type` | 型別對不上 | 檢查 Entity 和 SQL 的型別 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 資料庫的版本控管 | Database Migration |
| 一支改動檔案 | migration script |
| Flyway 的紀錄本 | `flyway_schema_history` 表 |
| 檔案內容的指紋 | checksum |
| 從現有資料庫開始算 | baseline |
| JPA 只檢查不改表 | `ddl-auto: validate` |

## 自我檢核

1. 沒有 Flyway，五個人的資料庫會發生什麼事？
2. 已經 push 出去的 migration 可以修改嗎？為什麼？
3. `ddl-auto` 應該設成什麼？為什麼？
4. 檔名格式是什麼？底線幾個？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Flyway 官方文件](https://documentation.red-gate.com/flyway) | 英文 | 入門 | 20 分 |
| [Spring Boot + Flyway 教學（iThome）](https://ithelp.ithome.com.tw/articles/10296595) | 繁中 | 入門 | 15 分 |

## 相關頁面

[資料表設計](23-資料表設計.md)　[ORM 與 JPA](25-ORM與JPA.md)　[Git 是什麼](../team/02-Git是什麼.md)
