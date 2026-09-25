# Spring Boot 後端：第一次啟動與學習順序

這是現有 `backend/` 專案的操作入口。先完成本頁的環境準備，再到 [Spring Boot 課程](tutorial/index.html) 讀觀念與商品 API 實作。課程用 Northwind 練習資料；火鍋店正式功能仍以 [專案規格](../spec/00-架構分層與技術選型.md) 和 [API 規格](../spec/04-API規格.md) 為準。

## 先備工具與版本

| 工具 | 本專案設定 | 用途 |
|---|---|---|
| JDK | 21 | 編譯與執行 Java；在終端機執行 `java -version` 確認。 |
| Spring Boot | 以 `backend/pom.xml` 的 parent 版本為準，目前 4.1.1 | 不需單獨安裝，由 Maven 下載。 |
| Maven | 使用 `backend/mvnw`／`mvnw.cmd` | Wrapper 會使用專案指定的 Maven，不需另行安裝。 |
| Docker Desktop 或 OrbStack | 能執行 `docker compose` | 啟動 MySQL 5.7 與 phpMyAdmin。 |
| VS Code | 建議安裝 Extension Pack for Java、Spring Boot Extension Pack | 開啟 `backend/`，讓 Java 與 Maven 專案匯入。 |

macOS、Linux 和 Windows 都要先安裝 Git 與 JDK 21。VS Code 請開啟**包含 `pom.xml` 的 `backend/` 資料夾**，不要只開 `src/`。若編輯器顯示錯誤，先用命令面板的 `Java: Configure Java Runtime` 確認專案使用 JDK 21。

## 第一次啟動：照順序做

下列指令假設目前站在 repository 根目錄。第一次只需建立一次 `.env`；以後從第 3 步開始。

1. **建立本機設定檔。** macOS／Linux 執行：

   ```bash
   cd backend
   cp .env.example .env
   ```

   Windows PowerShell 執行：

   ```powershell
   Set-Location backend
   Copy-Item .env.example .env
   ```

2. **編輯 `backend/.env`。** 換掉兩個範例密碼，並使 `SPRING_DATASOURCE_USERNAME` 與 `MYSQL_USER` 相同、`SPRING_DATASOURCE_PASSWORD` 與 `MYSQL_PASSWORD` 相同。`MYSQL_ROOT_PASSWORD` 是資料庫管理員密碼，和一般應用程式帳號分開。不要把 `.env` 提交到 Git；專案只提交 `.env.example`。
3. **啟動資料庫。** 在 `backend/` 執行：

   ```bash
   docker compose up -d
   docker compose ps
   ```

   等 `mysql` 顯示 healthy，再開啟 `http://localhost/`。若 80 或 3306 埠已被其他程式使用，先排除衝突；不要以為容器已成功啟動。
4. **準備練習資料。** 在 phpMyAdmin 選取 `northwind` 資料庫後，匯入老師提供的 **MySQL 版 Northwind** SQL。Repository 沒有附完整 Northwind；如果手邊沒有 SQL，可在全新、空白的 `northwind` 資料庫匯入 [最小練習資料](northwind-minimal.sql)。最小資料只有 `Categories`、`Products` 和一筆 Chai，足以完成商品 API 練習，不能當作完整 Northwind。已匯入完整版本時，**不要再匯入最小資料**。
5. **檢查資料表。** 在 phpMyAdmin 的 SQL 頁籤執行：

   ```sql
   SELECT ProductID, ProductName FROM Products ORDER BY ProductID LIMIT 5;
   SELECT CategoryID, CategoryName FROM Categories WHERE CategoryID = 1;
   ```

   兩句都應成功，第二句應回傳分類 1；[單元 10D](tutorial/unit-10d-verify.html) 的新增範例會用到它。
6. **啟動後端。** 仍在 `backend/`，macOS／Linux 執行 `./mvnw spring-boot:run`；Windows PowerShell 執行 `./mvnw.cmd spring-boot:run`。第一次執行會下載依賴。看到 `Started SmartOrderApplication` 後，另開終端機瀏覽 `http://localhost:8080/api/products`，應取得 JSON 商品清單。

`application.properties` 會讀取 `backend/.env`；`compose.yaml` 也讀同一份檔案。Spring Boot 在主機執行，連到 `127.0.0.1:3306/northwind`。`spring.jpa.hibernate.ddl-auto=none`，因此應先匯入資料表，啟動程式不會替你建立 Northwind 表。

## 常見卡關

| 現象 | 先檢查 |
|---|---|
| `docker compose` 說變數未設定 | 是否先在 `backend/` 建立並填好 `.env`，且從該目錄執行指令。 |
| 3306 或 80 埠已被使用 | `docker compose ps` 是否顯示容器失敗；檢查本機既有 MySQL 或網頁服務。 |
| `Access denied for user` | `.env` 中的應用程式帳密是否與 MySQL 初始化時使用的帳密一致。MySQL 已建立資料卷後，修改 `.env` 不會自動修改資料庫內的帳密。 |
| `Table 'northwind.Products' doesn't exist` | 是否選對 `northwind` 資料庫並匯入 MySQL 版 SQL；到 phpMyAdmin 看表名大小寫。 |
| 連得上資料庫，但 API 回空清單 | 先在 phpMyAdmin 執行上面的 `SELECT`，確認 `Products` 真的有資料。 |
| HTTP 401／403 | 核對目前 `backend/config/SecurityConfig.java`。教材的本機商品 API 範例可直接呼叫；若團隊已改權限設定，需依新設定登入。 |

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

## 團隊共用設定

- Spring Boot 版本固定在 `backend/pom.xml`，Java 版本固定為 21。更新版本時同步調整本文件與課程中的版本說明。
- 提交 `pom.xml`、Maven Wrapper、`src/` 與 `.env.example`；保留 `.env`、`target/`、IDE 暫存檔與密碼在本機。
- `backend/` 是程式碼所在位置；`docs/spring-boot/` 是教學。更改實際程式行為後，對照更新單元 10 的說明與驗收請求。
