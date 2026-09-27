# Spring Boot 學習導覽

> **第一次啟動專案：請看 [根目錄 README 的環境建置](../../README.md#啟動後端)。** 安裝工具、MySQL、IntelliJ 與常見問題統一維護在根目錄。

這一頁整理課程的閱讀順序。課程使用 Northwind 練習資料；火鍋店正式功能以[專案規格](../spec/00-架構分層與技術選型.md)與 [API 規格](../spec/04-API規格.md)為準。

## 學習順序與既有文件的關係

| 目的 | 文件 | 本專案對照 |
|---|---|---|
| 先用白話理解 Maven、DI、三層架構、JPA | [技術總表](../tech/00-技術總表.md) 的後端與資料庫短篇 | 短篇以火鍋店功能為例，適合查名詞。 |
| 從普通 Java 一步步走到 HTTP 和資料庫 | [課程 02～09](tutorial/index.html) | Northwind 練習情境；部分程式碼是觀念片段，不需全部複製進專案。 |
| 對著現有程式完成商品 API | [單元 10～10D](tutorial/unit-10-api.html) | `backend/src/main/java/tw/ispan/smartorder/` 已有 Entity、DTO、Repository、Service、Controller 與例外處理。按 10A → 10B → 10C → 10D 對照閱讀。 |
| 實作火鍋店功能 | [模組規格](../spec/02-需求規格.md) 與 [API 規格](../spec/04-API規格.md) | Northwind 的 `Products`／`Categories` 是練習表，不等於正式菜單表。 |

單元 10D 只更新、刪除自己 POST 建立的測試商品。不要修改原始 Northwind 商品。

### 相同主題，該讀哪一份？

原本已有 50 篇火鍋店技術短文；新課程保留 Northwind 範例，是因為它把同一觀念串成連續的操作。下表把重疊主題接起來，避免把兩套範例當成兩個不同做法。

| 想學的事 | 先查短篇 | 再看連續課程 |
|---|---|---|
| 工具、Java 與 Spring 啟動 | [Java 與 JDK](../tech/backend/12-Java與JDK.md)、[Maven](../tech/backend/13-Maven.md)、[Spring Boot](../tech/backend/14-SpringBoot是什麼.md) | [02 Maven](tutorial/unit-02-maven.html) → [04 Spring Boot](tutorial/unit-04-spring-boot.html) |
| 依賴注入與三層分工 | [依賴注入](../tech/backend/15-依賴注入.md)、[三層架構](../tech/backend/16-三層架構.md) | [03～03B](tutorial/unit-03-spring-core.html) → [05 MVC](tutorial/unit-05-spring-mvc.html) |
| HTTP 與 REST 合約 | [REST API 設計](../tech/web/10-REST-API設計.md) | [06 REST](tutorial/unit-06-rest-api.html) → [10C Controller](tutorial/unit-10c-controller.html) |
| Entity、JPA、查詢與交易 | [ORM 與 JPA](../tech/database/25-ORM與JPA.md)、[交易](../tech/database/27-交易Transaction.md) | [07～07B](tutorial/unit-07-jpa.html) → [10A](tutorial/unit-10a-model.html) → [10B](tutorial/unit-10b-service.html) |
| 驗證、錯誤、測試與權限 | [全域例外處理](../tech/backend/18-全域例外處理.md)、[單元測試](../tech/quality/47-單元測試.md)、[Spring Security](../tech/backend/20-SpringSecurity.md) | [08 品質](tutorial/unit-08-quality.html) → [09 安全](tutorial/unit-09-security.html)；09 的安全設定是獨立延伸，不是單元 10 的目前設定 |

短篇說明火鍋店規格與通用做法；單元 10A～10D 則對照已存在的 Northwind 程式碼。當兩份文件的示例類別名稱不同，以你正在操作的專案檔案為準。

## 教材維護

`backend/` 是程式碼，`docs/spring-boot/` 是教學。調整實際程式行為後，請同步更新單元 10 的說明與驗收請求。
