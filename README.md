# Smart Order｜火鍋店點餐系統

多人共鍋的台式火鍋店線上點餐系統。**React + Spring Boot + MySQL** · 5 人協作 · 6 週開發

[環境建置](#環境建置) · [啟動前端](#啟動前端) · [啟動後端](#啟動後端) · [日常開發](#日常開發) · [常見問題](#常見問題) · [專案文件](docs/README.md)

---

## 環境建置

**本頁以 Windows 為主：PowerShell + MAMP MySQL + IntelliJ IDEA。** 第一次加入專案，照下面的流程完成即可；macOS／Linux 的差異收在折疊區塊。

| 你要做什麼 | 閱讀順序 |
| --- | --- |
| 前端開發 | 安裝 Git、Node.js → 取得專案 → [啟動前端](#啟動前端) |
| 後端開發 | 安裝 Git、JDK、IntelliJ、MAMP → 取得專案 → [啟動後端](#啟動後端) |
| 前後端一起開發 | 完成上面兩條流程，各自保持前後端執行中 |

### 需要安裝的工具

| 用途 | 工具 | 版本／說明 |
| --- | --- | --- |
| 共用 | Git | 2.x |
| 前端 | Node.js + npm | **Node 24.x、npm 11.19.0** |
| 後端 | JDK | **21** |
| 後端 | IntelliJ IDEA | 開啟現有 Maven 專案 |
| 資料庫 | MAMP（提供 MySQL） | 用 MAMP 啟動 MySQL、透過 phpMyAdmin 管理資料 |

React、Vite、Tailwind 與 Spring Boot 由專案下載；Maven 已附 Wrapper，不需另裝。Docker 是選用方案，Windows 使用 **MAMP + IntelliJ IDEA** 就能開發後端。

### 取得專案

在 GitHub 複製此 repository 的 clone URL，取代下方 `<repo-url>`。已下載的同學直接進入專案資料夾即可。

```powershell
git clone <repo-url> smart_order
cd smart_order
```

> 以下「專案根目錄」指包含這份 `README.md`、`frontend/` 與 `backend/` 的資料夾。除折疊的 macOS／Linux 補充外，所有命令列步驟皆使用 PowerShell。

## 啟動前端

### 1. 確認 Node 與 npm

```powershell
node -v
npm -v
```

應為 **Node 24.x、npm 11.19.0**。若 Node 正確、只有 npm 版本不同，執行 `npm install -g npm@11.19.0` 後再確認。

<details markdown="1">
<summary>尚未安裝 Node？Windows 使用 nvm-windows</summary>

```powershell
winget install CoreyButler.NVMforWindows
```

重開 PowerShell，再執行：

```powershell
nvm install 24
nvm use 24
npm install -g npm@11.19.0
```

若已用其他方式安裝 Node 24，不必另外安裝版本管理工具。

</details>

<details markdown="1">
<summary>macOS 補充：使用 mise 安裝 Node（Windows 可跳過）</summary>

已安裝 Homebrew 的同學可執行：

```bash
brew install mise
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
exec zsh
```

回到專案根目錄，執行：

```bash
mise install
npm install -g npm@11.19.0
```

若原本使用 nvm，在專案根目錄執行 `nvm install`、`nvm use` 即可讀取 `.nvmrc`。

</details>

### 2. 安裝套件並啟動

從**專案根目錄**執行：

```powershell
cd frontend
npm ci
npm run dev
```

**完成確認：** 開啟終端機顯示的 Local 網址，通常是 `http://localhost:5173`。保持終端機開啟；停止時按 `Ctrl+C`。

## 啟動後端

目前 `backend/` 使用 **Northwind 商品 API** 作為練習；火鍋店正式功能另見[專案規格](docs/spec/00-架構分層與技術選型.md)。

### 1. 建立本機設定

從**專案根目錄**執行。只有 `.env` 尚未存在時才複製；已有設定直接編輯。

```powershell
# Windows PowerShell
cd backend
Copy-Item .env.example .env
```

<details markdown="1">
<summary>macOS／Linux 補充：建立設定檔（Windows 可跳過）</summary>

```bash
cd backend
cp .env.example .env
```

</details>

### 2. 使用 MAMP 準備 MySQL

1. 開啟 MAMP、啟動 MySQL，在連接埠設定中確認 **MySQL port**。
2. 從 MAMP 起始頁開啟 phpMyAdmin，使用本機 MySQL 管理員帳號登入。
3. 建立 `northwind` 資料庫，字元集選 `utf8mb4`、定序選 `utf8mb4_unicode_ci`；已存在則沿用。
4. 建立應用程式帳號（例如 `spring`），設定密碼、允許本機連線，並授予 `northwind` 權限。也可沿用已設定好的課程帳號。
5. 編輯 `backend/.env` 的三個連線欄位，填入實際值：

```properties
SPRING_DATASOURCE_URL=jdbc:mysql://127.0.0.1:8889/northwind?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Taipei&characterEncoding=utf8
SPRING_DATASOURCE_USERNAME=spring
SPRING_DATASOURCE_PASSWORD=your_actual_mysql_password
```

> 上例假設 MySQL 使用 `8889`；若本機是 `3306`，請改成 `3306`。MySQL 埠與 Apache 網頁埠不同，可對照 [MAMP 連接埠說明](https://documentation.mamp.info/en/MAMP-Windows/Preferences/Ports/)。

MAMP 不會讀取 `.env` 的 `MYSQL_*` 欄位，這些欄位可忽略。資料庫與帳號需先在 MySQL 建立，修改 `.env` 不會替你建立它們。Java 專案保留在 `backend/`，不需放進 MAMP 的 `htdocs`。

<details markdown="1">
<summary>替代方案：自行安裝 MySQL</summary>

啟動本機 MySQL，用自己的管理工具完成上面的建庫與帳號設定，再將實際埠號、帳號、密碼填入 `.env`。接著繼續第 3 步。

</details>

<details markdown="1">
<summary>替代方案：Docker Compose（使用 MAMP 可跳過）</summary>

1. 安裝並啟動 Docker Desktop。
2. 在 `backend/.env` 換掉 `MYSQL_ROOT_PASSWORD`、`MYSQL_PASSWORD` 的範例密碼；保持 `MYSQL_DATABASE=northwind`，`MYSQL_USER` 使用一般帳號，勿填 root。
3. 將 `SPRING_DATASOURCE_USERNAME`／`SPRING_DATASOURCE_PASSWORD` 分別設為 `MYSQL_USER`／`MYSQL_PASSWORD` 的值；連線 URL 使用範例中的 `127.0.0.1:3306/northwind`。
4. 在 **`backend/`** 執行：

```powershell
docker compose up -d
docker compose ps
```

等 `mysql` 顯示 **healthy**，開啟 `http://localhost/` 使用 phpMyAdmin，再繼續第 3 步。首次初始化會建立資料庫與應用程式帳號。

Compose 使用 MySQL **5.7.44**，佔用主機的 **3306**（MySQL）與 **80**（phpMyAdmin）；請避免與 MAMP 或其他服務衝突。已有資料卷時，修改 `.env` 不會更新資料庫帳密。停止可用 `docker compose down`，保留資料卷供下次使用。

</details>

### 3. 匯入 Northwind

在 phpMyAdmin 選取 `northwind`，匯入老師提供的 **MySQL 版 Northwind SQL**。

沒有匯入檔時，可在**全新、空白的資料庫**匯入[最小練習資料](docs/spring-boot/northwind-minimal.sql)，內含 `Categories`、`Products` 與一筆 Chai，足以練習商品 API。已匯入完整 Northwind 時，不要再匯入最小資料。

在 SQL 頁籤檢查：

```sql
SELECT ProductID, ProductName FROM Products ORDER BY ProductID LIMIT 5;
SELECT CategoryID, CategoryName FROM Categories WHERE CategoryID = 1;
```

**完成確認：** 兩句都成功，且第二句查得到分類 1。專案不會自動建表，因此資料必須先匯入。

### 4. 在 IntelliJ IDEA 啟動

選擇 **Open**，開啟 `backend/` 或 `backend/pom.xml`，以 Maven 專案匯入，等待依賴下載完成。

| 設定位置 | 要設定的值 |
| --- | --- |
| File → Project Structure → Project SDK | **JDK 21** |
| Settings → Build Tools → Maven | 使用 **Maven Wrapper**；匯入與執行的 JDK／JRE 都設為 **21** |
| Run → Edit Configurations → Main class | `tw.ispan.smartorder.SmartOrderApplication`，使用 backend 模組的 classpath |
| Run → Edit Configurations → Working directory | **`backend/` 的絕對路徑**，例如 `C:\projects\smart_order\backend` |

開啟 `src/main/java/tw/ispan/smartorder/SmartOrderApplication.java`，建立 `main()` 的執行設定，確認上表後按 **Run** 或 **Debug**。Maven 設定可參考 [IntelliJ 官方說明](https://www.jetbrains.com/help/idea/maven-support.html)。

> **Working directory 務必指向 `backend/`。** Spring Boot 從執行目錄讀取 `.env`。若直接開啟 backend 專案可填 `$PROJECT_DIR$`；若開啟整個 repository，填 `$PROJECT_DIR$/backend`。

**完成確認：** 出現 `Started SmartOrderApplication`，瀏覽 `http://localhost:8080/api/products` 可看到包含 `items` 的 JSON。

<details markdown="1">
<summary>替代方案：從終端機啟動／使用 VS Code</summary>

在 **`backend/`** 執行，第一次會下載依賴：

```powershell
# Windows PowerShell
.\mvnw.cmd spring-boot:run
```

```bash
# macOS / Linux
./mvnw spring-boot:run
```

VS Code 可安裝 Extension Pack for Java、Spring Boot Extension Pack，開啟 `backend/` 並將 Java Runtime 設為 JDK 21，再使用上述指令。終端機與 IntelliJ 請擇一啟動，避免同時佔用 `8080`。

</details>

## 日常開發

第一次建置完成後，**啟動 MySQL → IntelliJ 執行後端 → 前端執行 `npm run dev`**。不必重建 `.env` 或重新匯入資料；拉到套件異動時再執行 `npm ci`／同步 Maven。

| 要做的事 | 位置與操作 |
| --- | --- |
| 啟動前端 | `frontend/` → `npm run dev` |
| 檢查前端 | `frontend/` → `npm run lint`、`npm run typecheck`、`npm run build` |
| 預覽前端建置 | `frontend/` → `npm run preview`（先 build） |
| 啟動／除錯後端 | IntelliJ → Run／Debug |
| 查看商品 API | `http://localhost:8080/api/products` |
| 互動測試 API | `http://localhost:8080/swagger-ui/index.html` |

<details markdown="1">
<summary>團隊約定與版本來源</summary>

- 一般安裝使用 **`npm ci`**；只有升級套件才用 `npm install <pkg>@<version>`，並一起提交 lockfile。不混用 yarn／pnpm。
- Node 版本由 `.tool-versions`、`.nvmrc` 與 `frontend/package.json` 的 `engines` 決定，升級時一起更新；npm 版本見 `packageManager`。
- 前端套件版本以 `frontend/package-lock.json` 為準；Java、Spring Boot 版本以 `backend/pom.xml` 為準。
- 提交 `.env.example`；`.env`、密碼、`target/` 與 IDE 暫存檔留在本機。
- 前端 CI 會跑 `npm ci` → `lint` → `build`，設定見 [frontend-ci.yml](.github/workflows/frontend-ci.yml)。

</details>

## 常見問題

| 現象 | 先檢查 |
| --- | --- |
| `npm ci` 回報版本不符 | `node -v` 是否為 24.x；切換版本後重開終端機確認 |
| MySQL 連線失敗 | MySQL 是否啟動；`.env` 的埠號是否與 MAMP／本機設定一致 |
| `Access denied for user` | 帳號與密碼是否已在 MySQL 設定，並允許本機連線、存取 `northwind` |
| `Unknown database`／找不到 `Products` | 是否在目前連線的 MySQL 建立 `northwind` 並匯入資料；核對表名大小寫 |
| 找不到 `SPRING_DATASOURCE_URL` | Working directory 是否為 `backend/`；檔名是否誤存成 `.env.txt` |
| Java 版本或編譯錯誤 | Project SDK、Maven 與執行設定是否都使用 JDK 21，再同步 Maven |
| `8080` 已被使用 | 是否重複啟動後端；停止先前的程序再執行 |
| API 回傳空清單 | 在 phpMyAdmin 執行上面的 SELECT，確認 `Products` 有資料 |
| API 回傳 401／403 | 確認目前 `SecurityConfig.java`；若已改登入權限，依新設定驗證 |
| Docker 顯示變數未設定／埠號衝突 | 從 `backend/` 執行、填好 `.env` 的 `MYSQL_*`；確認 3306 與 80 未被佔用 |

## 文件與目錄

| 你想找什麼 | 入口 |
| --- | --- |
| 規格、分工、UI 與技術教學 | [專案文件總覽](docs/README.md) |
| Spring Boot 學習順序 | [後端學習導覽](docs/spring-boot/README.md) |
| 網頁版文件 | [文件首頁](docs/site/index.html) · [本頁網頁版](docs/site/setup.html) |

```text
smart_order/
├── README.md       # 統一環境建置與啟動入口
├── frontend/       # React + Vite + Tailwind
├── backend/        # Spring Boot + Maven Wrapper
└── docs/           # 規格、設計、技術教學與文件網站
```

<details markdown="1">
<summary>維護文件與設計工具（一般開發可跳過）</summary>

環境建置只修改根目錄 `README.md`；其餘文件修改 `docs/` 下的 Markdown。Windows 安裝 Python 3 後，在專案根目錄的 PowerShell 重建網頁版：

```powershell
py -m pip install markdown
py docs/build_site.py
```

`docs/site/` 為自動產生檔，不直接編輯。Spring Boot 課程維護在 `docs/spring-boot/tutorial/` 原始 HTML；設計量測等額外工具見 [mockup 工具說明](docs/ui/mockups/tools/README.md)。

</details>
