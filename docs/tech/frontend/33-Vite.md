# Vite

**難度** ★☆☆☆☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 1 週

## 一句話

Vite 是**前端的啟動器和打包機**：開發時幫你即時重整，上線時把幾百個檔案壓成幾個。

## 想像一下

你寫的 React 程式碼，瀏覽器其實**看不懂**：

- 瀏覽器不認識 JSX（那個 `<div>` 寫在 JS 裡的語法）
- 瀏覽器不認識 `import './Button.css'`
- 你有 200 個小檔案，一個一個載入會很慢

**需要有人在中間翻譯和整理**。以前是 webpack，現在多半用 Vite（更快、設定更少）。

## 它做兩件事

**① 開發時：即時預覽**

```bash
npm run dev
```

打開 `http://localhost:5173`，你改一行程式碼**存檔的瞬間**畫面就更新了，而且不會重整整頁（狀態還在）。這叫 HMR（熱模組替換）。

**② 上線時：打包**

```bash
npm run build
```

把幾百個檔案壓成 `dist/` 資料夾裡的幾個檔案，程式碼壓縮、沒用到的砍掉。這個資料夾就是要丟到 Vercel 的東西。

## 怎麼開一個專案

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm run dev
```

**四行，一個 React 專案就跑起來了。**

（練習用 `--template react` 即可；正式專案已改用 TypeScript，設定見 `frontend/tsconfig.json`，並開了 `allowJs` 讓 `.jsx` 與 `.tsx` 共存。）

## 專案結構

我們的專案已經建好了，在 repo 的 `frontend/`。顧客端與店家端**同一個 React 專案**，
用 `features/` 分開（不是兩個專案）：

```
frontend/
├── index.html               ← 入口，只有一個空的 <div id="root">
├── package.json
├── vite.config.js           ← Vite 設定（react + @tailwindcss/vite 兩個外掛）
├── .env.development         ← npm run dev 讀這個（見下面「環境變數」）
├── .env.production          ← npm run build 讀這個
└── src/
    ├── main.jsx             ← 程式進入點
    ├── App.jsx              ← 根元件
    ├── style.css            ← 樣式進入點，只有 @import
    ├── styles/
    │   ├── tokens.colors.css     ← 色彩 token（見 14-色彩Token）
    │   ├── tokens.type.css       ← 字體與十個 type-* 字級
    │   ├── tokens.space.css      ← 間距例外與七個圓角
    │   └── base.css              ← 全站基底樣式
    ├── routes/              ← 路由設定
    ├── layouts/             ← 顧客端手機殼、店家端側欄＋主區
    ├── components/          ← 共用元件（Button、Card、Badge…共 10 個）
    ├── features/
    │   ├── customer/        ← 顧客端各功能
    │   └── admin/           ← 店家端各功能
    │       └── kds/         ← 單頁專用的 kds.colors.css 就放在這種地方
    ├── hooks/               ← 自訂 hook
    ├── services/             ← 跟外面講話的東西全部放這裡
    │   ├── api/                  ← HTTP：client.js、各模組
    │   └── realtime/             ← WebSocket：socket.js
    ├── utils/               ← 小工具函式
    ├── types/               ← 共用的型別／常數
    └── assets/              ← 圖片
```

**沒有 `tailwind.config.js`。** 我們用的是 Tailwind v4，設定寫在 CSS 裡，
細節看 [39-Tailwind](39-Tailwind.md)。網路上教學叫你建 config 檔的那些都是 v3。

## 環境變數

同一份程式碼，在不同地方跑要用不同設定——開發時打 `localhost:8080`，上線時打真的網址。
把這種會變的值抽出來放進 `.env` 檔，程式碼就不用改。

**專案裡已經有兩個檔，都已經進版控**（沒有機密，見下面第 2 點）：

```bash
# frontend/.env.development —— npm run dev 讀這個
VITE_API_BASE=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
```

```bash
# frontend/.env.production —— npm run build 讀這個
VITE_API_BASE=/api
VITE_WS_URL=
```

在程式裡用：

```js
const BASE = import.meta.env.VITE_API_BASE;
```

### 四個重點，違反任何一個都不會報錯

**1. 變數名一定要 `VITE_` 開頭**，否則讀出來是 `undefined`。
Vite 預設把所有環境變數擋在前端外面，只有 `VITE_` 開頭的才放行。

**2. 反過來說，`VITE_` 開頭的東西等於公開。**
打包後就寫在 JS 檔裡，按 F12 就看得到。所以絕對不要放密碼、API 金鑰。
（也因為這樣，這兩個檔進版控是安全的，而且**必須**進版控——
否則組員 clone 下來沒有設定，`VITE_API_BASE` 會是 `undefined`。）

**3. 讀出來永遠是字串，沒有布林值。**
`.env` 沒有型別，`VITE_FOO=false` 讀出來是字串 `"false"`，而空字串以外的字串都是真值：

```js
if (import.meta.env.VITE_FOO)            // ★ 錯！"false" 也會進這個分支
if (import.meta.env.VITE_FOO === 'true') // ✓ 要當布林用一定要自己比對
```

第一種寫法不會報錯，只會安靜地做錯事。**目前專案的兩個變數都是網址，沒有布林值**，
但之後要加開關型的變數時記得這條。

**4. 改完要重開 dev server。**
這些值是 build 時被「替換」進程式碼的，不是執行時去查表——
打包後 JS 裡直接就是 `"http://localhost:8080/api"` 這串字面值，
沒有任何查表的動作。所以改了 `.env` 而不重開，跑的還是舊值。

### 要改成自己機器的設定

**不要改那兩個檔**（會影響到所有人）。另外開 `.env.development.local`：

```bash
# frontend/.env.development.local —— 只有你自己的機器有
VITE_API_BASE=http://localhost:9090/api
```

`.local` 結尾的檔優先權比較高，而且 `.gitignore` 已經蓋掉它，不會被 commit 出去。

> **前端沒有 mock 開關。** 假資料放在後端（API 先回寫死的 JSON、不真的查 DB），
> 前端一律打真的位址。理由見 [05-開發流程與分工 §1.4.4](../../spec/05-開發流程與分工.md)。

## 開發代理（解決 CORS 的另一招）

`vite.config.js`：

```js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
```

這樣前端打 `/api/menu/items`，Vite 會幫你轉給 `localhost:8080`。**對瀏覽器來說都是同一個來源，就不會有 [CORS](../web/11-CORS跨來源.md) 問題。**

**但後端還是要設 CORS**，因為正式環境前後端是分開部署的。

## 15 分鐘動手小練習

```bash
npm create vite@latest my-test -- --template react
cd my-test && npm install && npm run dev
```

1. 打開 `http://localhost:5173`
2. 打開 `src/App.jsx`，把裡面的文字改成「火鍋店」
3. **存檔** ← 不要重整，看瀏覽器自己變了
4. 按幾下計數器按鈕讓數字變成 5
5. **再改一次文字存檔** ← 數字還是 5（狀態沒被重置，這就是 HMR）
6. 跑 `npm run build`，看 `dist/` 資料夾裡有什麼

## 你會遇到的坑

**① 環境變數沒有 `VITE_` 前綴**
`import.meta.env.API_BASE` 會是 `undefined`。

**② 改了 `.env` 沒重啟**
環境變數是啟動時讀的，要 `Ctrl+C` 再 `npm run dev`。

**③ 5173 被佔用**
Vite 會自動換成 5174。注意看終端機印出來的網址。

**④ 打包後打不開（白畫面）**
多半是路徑問題。部署到子路徑時要設 `base: '/子路徑/'`。

**⑤ 以為開發代理也會在正式環境生效**
不會。`server.proxy` **只有 `npm run dev` 時有用**。

**⑥ 把密鑰放進 `.env`**
打包後直接寫在 JS 檔裡，誰都看得到。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Port 5173 is in use, trying another one` | 埠號被佔 | 正常，看它換到幾號 |
| `Failed to resolve import "xxx"` | 找不到這個模組 | 套件沒裝，或路徑打錯 |
| `[vite] Internal server error` | 程式碼有語法錯誤 | 往下看真正的錯誤行數 |
| 白畫面、console 說 `Failed to load module script` | 打包路徑錯 | 檢查 `base` 設定 |
| `import.meta.env.XXX is undefined` | 沒有 `VITE_` 前綴，或沒重啟 | 兩個都檢查 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 前端的啟動器與打包機 | 建置工具 build tool |
| 存檔就更新 | HMR（Hot Module Replacement） |
| 開發伺服器 | dev server |
| 打包 | build / bundle |
| 打包好的成品 | `dist/` |
| 轉給後端 | proxy 代理 |

## 自我檢核

1. Vite 在開發時和上線時各做什麼？
2. 環境變數的名字一定要什麼開頭？
3. 環境變數可以放密鑰嗎？為什麼？
4. 設了 `server.proxy` 之後，後端還需要設 CORS 嗎？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Vite 官方中文文件](https://cn.vitejs.dev/guide/) | 簡中 | 入門 | 20 分 |
| [zh-hant.react.dev：安裝](https://zh-hant.react.dev/learn/installation) | **繁中** | 入門 | 10 分 |

## 相關頁面

[npm 與 node_modules](32-npm與套件.md)　[React 與 JSX](34-React與JSX.md)　[CORS 跨來源問題](../web/11-CORS跨來源.md)　[部署上線](../quality/50-部署上線.md)
