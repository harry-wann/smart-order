# Smart Order — Frontend (React + Vite)

## 環境建置

### 版本來源（單一真實來源）

| 項目 | 由誰決定 | 檔案 |
| --- | --- | --- |
| Node.js 版本 | `mise` / `asdf` / `nvm` | 根目錄 `.tool-versions`、`.nvmrc` |
| 套件版本 | `npm ci` | `frontend/package-lock.json` |
| 版本強制檢查 | `engine-strict` | `frontend/package.json` 的 `engines`、`frontend/.npmrc` |

目前鎖定 **Node.js 24.21.0**、**npm 11.19.0**。Node 版本不符時 `npm ci` 會直接報錯，不會讓錯誤版本裝進來。

### macOS

```bash
# 1. 安裝版本管理工具（擇一，建議 mise）
brew install mise
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
exec zsh

# 2. 在專案根目錄安裝 .tool-versions 指定的 Node
cd <專案根目錄>
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
cd <專案根目錄>
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
cd <專案根目錄>
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
nvm install 24.21.0
nvm use 24.21.0
cd frontend
npm ci
npm run dev
```

</details>

> Windows 建議在 PowerShell（非 CMD）操作；若使用 WSL2，請照 macOS/Linux 的指令做。

### 開發指令

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
4. **要換 Node 版本時**，同時更新根目錄 `.tool-versions`、`.nvmrc` 與 `frontend/package.json` 的 `engines`，並在 PR 說明中告知組員重跑 `mise install`。
5. CI（`.github/workflows/frontend-ci.yml`）會用同一份 `.tool-versions` 跑 `npm ci` → `lint` → `build`，本機過不了的 PR 在 CI 也會擋下來。

---

## 樣板說明（React + Vite）

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
