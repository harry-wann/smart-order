# 火鍋店點餐系統 — Smart Order

> 中高價位、多人共鍋的台式火鍋店線上點餐系統｜5 人協作｜開發期 6 週
> 技術棧：Spring Boot + MySQL ／ React + Tailwind ／ WebSocket + 排程 + Redis

| 想找什麼 | 去哪裡 |
| --- | --- |
| 專案文件（規格、模組、UI、技術教學） | [`docs/README.md`](docs/README.md) |
| 前端說明 | [`frontend/README.md`](frontend/README.md) |
| 環境建置 | 見下方 ↓ |

---

## 環境建置

### 需要安裝的工具與版本

| 分類 | 工具 | 版本 | 必要性 | 備註 |
| --- | --- | --- | --- | --- |
| 共用 | Git | 2.x | 必要 | macOS 內建（Xcode Command Line Tools）；Windows 用 `winget install Git.Git` |
| 共用 | 版本管理工具：`mise`（建議）／ `asdf` ／ `nvm` ／ `nvm-windows` | 最新版，擇一 | 必要 | 讀 `.tool-versions` 或 `.nvmrc` 自動安裝正確的 Node |
| 前端 | Node.js | **24.x**（任一 24 版） | 必要 | `engine-strict` 強制檢查，非 24 版 `npm ci` 直接失敗 |
| 前端 | npm | **11.19.0**（Node 24 內建） | 必要 | `package.json` 的 `packageManager` 鎖定；不要用 yarn / pnpm |
| 後端 | JDK | **17 LTS** | 後端開工後必要 | 建議 Eclipse Temurin |
| 後端 | Maven | Wrapper（`mvnw`，隨 repo 附上） | 不用另外裝 | Spring Boot 3.x 由 `pom.xml` 決定 |
| 後端 | Docker Desktop（含 Docker Compose v2） | 最新版 | 後端開工後必要 | `docker compose up` 起本機 **MySQL 8.0** 與 **Redis 7**，不用手動裝資料庫 |
| 後端 | IntelliJ IDEA | Community 或 Ultimate | 建議 | |
| 後端 | DBeaver | 最新版 | 選用 | 看資料庫用 |
| 文件工具 | Python 3 + `markdown` 套件 | 3.x | 選用 | 只有要重建 `docs/site/` 才需要：`pip3 install markdown` |
| 文件工具 | Playwright（Python）+ Chromium | 最新版 | 選用 | 只有要跑 `docs/ui/mockups/tools/extract_layout.py` 量測畫框才需要 |

> 目前 repo 只有前端可跑，**現階段只要裝「共用」與「前端」兩類**；後端骨架推上 `develop` 後再裝後端工具。
> 各技術的選型理由與版本依據見 [`docs/spec/01-專案總覽.md`](docs/spec/01-專案總覽.md#4-技術棧)。

### 版本來源（單一真實來源）

| 項目 | 由誰決定 | 檔案 |
| --- | --- | --- |
| Node.js 版本 | `mise` / `asdf` / `nvm` | `.tool-versions`、`.nvmrc` |
| 套件版本 | `npm ci` | `frontend/package-lock.json` |
| 版本強制檢查 | `engine-strict` | `frontend/package.json` 的 `engines`、`frontend/.npmrc` |

目前要求 **Node.js 24.x**（任一 24 版皆可）、**npm 11.19.0**。Node 版本不符時 `npm ci` 會直接報錯，不會讓錯誤版本裝進來。

### macOS

```bash
# 1. 安裝版本管理工具（擇一，建議 mise）
brew install mise
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
exec zsh

# 2. 在專案根目錄安裝 .tool-versions 指定的 Node
git clone <repo-url> smart-order
cd smart-order
mise install

# 3. 安裝套件並啟動
cd frontend
npm ci
npm run dev
```

<details>
<summary>macOS 改用 nvm</summary>

```bash
brew install nvm   # 或參考 https://github.com/nvm-sh/nvm 的安裝說明
cd smart-order
nvm install        # 讀 .nvmrc
nvm use
cd frontend && npm ci && npm run dev
```

</details>

### Windows

```powershell
# 1. 安裝版本管理工具（擇一，建議 mise）
winget install jdx.mise
# 讓 PowerShell 每次啟動都套用 mise
Add-Content $PROFILE 'mise activate pwsh | Out-String | Invoke-Expression'
# 重開 PowerShell 後繼續

# 2. 在專案根目錄安裝 .tool-versions 指定的 Node
git clone <repo-url> smart-order
cd smart-order
mise install

# 3. 安裝套件並啟動
cd frontend
npm ci
npm run dev
```

<details>
<summary>Windows 改用 nvm-windows</summary>

nvm-windows **不會**自動讀 `.nvmrc`，版本要自己打：

```powershell
winget install CoreyButler.NVMforWindows
# 重開 PowerShell
nvm install 24
nvm use 24
cd frontend
npm ci
npm run dev
```

</details>

> Windows 建議在 PowerShell（非 CMD）操作；若使用 WSL2，請照 macOS 的指令做。

### 開發指令（在 `frontend/` 底下執行）

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 啟動開發伺服器（HMR） |
| `npm run build` | 產生 production build |
| `npm run preview` | 本機預覽 production build |
| `npm run lint` | 執行 Oxlint |

### 團隊規則

1. **一律使用 `npm ci`，不要用 `npm install`。**
   `npm ci` 嚴格照 `package-lock.json` 安裝；`npm install` 會依 `^` 範圍抓新版並改寫 lockfile，造成「我這邊正常、你那邊壞掉」。
2. **要升級套件時**才用 `npm install <pkg>@<version>`，並且把改動後的 `package-lock.json` 一起 commit。
3. **不要混用 yarn / pnpm。** `package.json` 已用 `packageManager` 欄位鎖定 npm。
4. **要換 Node 版本時**，同時更新 `.tool-versions`、`.nvmrc` 與 `frontend/package.json` 的 `engines`，並在 PR 說明中告知組員重跑 `mise install`。
5. CI（[`.github/workflows/frontend-ci.yml`](.github/workflows/frontend-ci.yml)）會用同一份 `.tool-versions` 跑 `npm ci` → `lint` → `build`，本機過不了的 PR 在 CI 也會擋下來。

---

## 目錄結構

```
.
├── .tool-versions      # Node 版本（mise / asdf）
├── .nvmrc              # Node 版本（nvm）
├── .github/workflows/  # CI
├── frontend/           # React + Vite + Tailwind
├── backend/            # Spring Boot（待建立）
└── docs/               # 規格、模組、UI、技術教學
```
