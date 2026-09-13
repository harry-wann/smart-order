# npm 與 node_modules

**難度** ★☆☆☆☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 1 週

## 一句話

npm 是**前端版的 Maven**：幫你下載別人寫好的套件。

## 想像一下

前端也需要別人寫好的東西：路由、日期處理、圖示、WebSocket 客戶端……

npm 就是那個超市。你寫一張清單（`package.json`），打一個指令，它全部幫你抓回來放在 `node_modules` 資料夾裡。

## 三個檔案

| 檔案 | 是什麼 | 要 commit 嗎 |
|---|---|---|
| `package.json` | **你的購物清單** + 可以跑的指令 | ✅ 要 |
| `package-lock.json` | 這次實際抓到的**精確版本**（連套件的套件都記） | ✅ **要** |
| `node_modules/` | 真正抓下來的檔案，**幾萬個** | ❌ **絕對不要** |

`node_modules` 要加進 `.gitignore`。它動輒幾百 MB，而且隨時可以用 `npm install` 重建。

## package.json 長什麼樣

```json
{
  "name": "frontend-customer",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "@stomp/stompjs": "^7.0.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "@vitejs/plugin-react": "^4.3.0"
  }
}
```

| 區塊 | 意思 |
|---|---|
| `scripts` | 可以用 `npm run xxx` 跑的指令 |
| `dependencies` | **正式環境也需要**的套件 |
| `devDependencies` | **只有開發時需要**的（打包工具、測試工具） |

## 版本號的意思

```
"react": "^18.3.1"
          ↑ ↑ ↑
          │ │ └─ patch 修 bug
          │ └─── minor 加功能，但不會破壞舊的
          └───── major 大改版，可能不相容
```

| 符號 | 意思 |
|---|---|
| `^18.3.1` | 18.x.x 都可以，但不會跳到 19 |
| `~18.3.1` | 只允許 18.3.x |
| `18.3.1` | 只要這一版（最嚴格） |

`package-lock.json` 會把「這次實際抓到的精確版本」記下來，**所以五個人 `npm install` 出來的才會一模一樣**。這就是為什麼 lock 檔一定要 commit。

## 你只需要會這幾個指令

```bash
npm install               # 照 package.json 把全部套件裝好（第一次 clone 下來要跑）
npm install 套件名          # 裝一個新套件並寫進 package.json
npm install -D 套件名       # 裝成 devDependency
npm run dev               # 啟動開發伺服器
npm run build             # 打包成正式版
npm uninstall 套件名        # 移除
```

**日常只會用到 `npm install` 和 `npm run dev`。**

## 在我們的專案裡

兩個前端專案各有自己的 `package.json`：

```
frontend-customer/package.json    ← 各有一位唯一負責人
frontend-admin/package.json       ← 要加套件先在群組說一聲
```

**各自的唯一負責人才能改。** 要加套件先在群組講一聲，因為每個套件都是一個新的學習成本和風險。

我們會用到的套件很少：

| 套件 | 用途 |
|---|---|
| `react` / `react-dom` | 本體 |
| `react-router-dom` | [換頁](38-ReactRouter.md) |
| `@stomp/stompjs` + `sockjs-client` | [接 WebSocket](../realtime/42-前端接WebSocket.md) |
| `tailwindcss` | [樣式](39-Tailwind.md) |
| `lucide-react` | 圖示 |

**就這些。** 不要再加了——每多一個套件，就多一個可能壞掉的地方。

## 15 分鐘動手小練習

```bash
mkdir npm-test && cd npm-test
npm init -y                  # 產生一個 package.json
npm install dayjs            # 裝一個處理日期的小套件
ls node_modules | head        # 看看抓了多少東西下來
cat package.json              # 看 dependencies 多了 dayjs
```

然後建一個 `test.mjs`：

```js
import dayjs from 'dayjs';
console.log(dayjs().format('YYYY-MM-DD HH:mm'));
```

跑 `node test.mjs`。

**順便注意一下**：你只裝了 `dayjs` 一個，但 `node_modules` 裡可能有好幾個資料夾——那是 dayjs 自己需要的東西。

## 你會遇到的坑

**① 把 `node_modules` commit 上去**
幾萬個檔案，GitHub 會崩潰，PR 完全沒辦法看。
→ **第一天就要設 `.gitignore`。**

**② `package-lock.json` 衝突**
兩個人同時裝套件。
→ **不要手動解。** 刪掉 lock 檔，重跑 `npm install`，再 commit。

**③ 一直裝套件**
「有個套件可以做這個」——裝了 20 個，其中 15 個只用了一次。

**④ 忘記先 `npm install`**
clone 下來直接 `npm run dev`，噴找不到模組。

**⑤ Node 版本不一致**
五個人的 Node 版本差太多會出怪事。
→ 統一用 Node 20 LTS。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Cannot find module 'xxx'` | 套件沒裝 | `npm install` |
| `ERESOLVE unable to resolve dependency tree` | 套件版本互相衝突 | 先試 `npm install --legacy-peer-deps`，或降版本 |
| `EACCES: permission denied` | 權限問題 | 不要用 `sudo npm install`，改修 npm 的資料夾權限 |
| `npm ERR! code ENOENT ... package.json` | 你不在專案資料夾裡 | `cd` 到有 package.json 的地方 |
| `Module not found: Can't resolve './xxx'` | 檔案路徑錯 | 檢查大小寫（Mac 不分但 Linux 分） |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 前端的套件管理員 | npm（Node Package Manager） |
| 購物清單 | `package.json` |
| 精確版本紀錄 | `package-lock.json` |
| 抓下來的東西 | `node_modules` |
| 正式環境也要的 | dependencies |
| 只有開發要的 | devDependencies |

## 自我檢核

1. `node_modules` 要不要 commit？為什麼？
2. `package-lock.json` 的作用是什麼？要不要 commit？
3. `^18.3.1` 允許升到 19 嗎？
4. clone 一個新專案下來，第一件事要做什麼？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [npm 官方文件（入門）](https://docs.npmjs.com/about-npm) | 英文 | 入門 | 15 分 |
| [MDN：套件管理基礎](https://developer.mozilla.org/zh-TW/docs/Learn_web_development/Extensions/Client-side_tools/Package_management) | 繁中 | 入門 | 20 分 |

## 相關頁面

[Vite](33-Vite.md)　[命令列基本操作](../team/01-命令列.md)　[Maven 與相依套件](../backend/13-Maven.md)
