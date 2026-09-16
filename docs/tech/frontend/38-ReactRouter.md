# React Router

**難度** ★★☆☆☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 2 週

## 一句話

React Router 讓你的網站**有好幾個網址**，但換頁時不會整頁重新載入。

## 想像一下

傳統網站：點一個連結 → 瀏覽器整頁重新載入 → 白畫面閃一下 → 新頁面出現。

React 做的是「單頁應用」（SPA）：**整個網站其實只有一個 HTML 檔**。換頁時只是把畫面上的元件換掉，網址也跟著變，但**不會真的重新載入**。所以很快、不會閃。

React Router 就是負責「**看網址決定顯示哪個元件**」的工具。

## 基本設定

```jsx
// main.jsx
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

```jsx
// App.jsx
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      {/* 節錄幾條，完整清單見本頁「我們的路由表」 */}
      <Route path="/"                element={<EntryPage />} />
      <Route path="/t/:tableNo"      element={<TableEntryPage />} />
      <Route path="/order/menu"      element={<MenuPage />} />
      <Route path="/order/items/:id" element={<ItemDetailPage />} />
      <Route path="/order/cart"      element={<CartPage />} />
      <Route path="/order/submitted" element={<SubmittedPage />} />
      <Route path="/order/tickets"   element={<TicketsPage />} />
      <Route path="/reserve"         element={<ReserveEntryPage />} />
      <Route path="*"                element={<NotFoundPage />} />
    </Routes>
  );
}
```

## 三個你會用到的東西

**① `<Link>` 取代 `<a>`**

```jsx
import { Link } from 'react-router-dom';

<Link to="/order/cart">購物車</Link>       ✅
<a href="/order/cart">購物車</a>           ❌ 會整頁重新載入
```

**② `useNavigate` —— 用程式換頁**

```jsx
import { useNavigate } from 'react-router-dom';
import { submitCart } from '../api/cart';

function CartPage() {
  const navigate = useNavigate();

  async function handleSubmit() {
    await submitCart();                           // 不帶品項：整桌購物車一起送出（見 fetch 那頁）
    navigate('/order/tickets');                   // 送出後跳到訂單頁
  }

  return <button onClick={handleSubmit}>送出整桌點餐</button>;
}
```

`navigate(-1)` 是「回上一頁」。

**③ `useParams` —— 拿網址上的參數**

```jsx
// 路由是 /order/items/:id，使用者開了 /order/items/12
function ItemDetailPage() {
  const { id } = useParams();       // id = "12"（字串！）
  useEffect(() => {
    request(`/menu/items/${id}`).then(setItem);
  }, [id]);
}
```

**注意 `useParams` 拿到的一定是字串**，要數字的話自己 `Number(id)`。

## 巢狀路由（店家端會用到）

店家端有固定的側邊欄，只換右邊的內容：

```jsx
<Routes>
  <Route path="/admin" element={<AdminLayout />}>
    <Route path="tables"      element={<TablesPage />} />
    <Route path="kitchen"     element={<KitchenPage />} />
    <Route path="menu"        element={<MenuAdminPage />} />
    <Route path="waitlist"    element={<WaitlistPage />} />
  </Route>
</Routes>
```

```jsx
function AdminLayout() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">
        <Outlet />        {/* ← 子路由的內容會出現在這裡 */}
      </main>
    </div>
  );
}
```

## 保護需要登入的頁面

```jsx
function RequireStaff({ children }) {
  const { staff } = useContext(AuthContext);
  if (!staff) return <Navigate to="/admin/login" replace />;
  return children;
}

<Route path="/admin" element={<RequireStaff><AdminLayout /></RequireStaff>}>
```

**提醒**：這只是體驗上的保護。**真正的權限一定要在後端擋**（見 [Spring Security](../backend/20-SpringSecurity.md)）。

## 我們的路由表

以 [10-UI/UX 規格](../../ui/10-UI-UX規格.md) 的頁面表為準，下面是顧客端的對照：

| 代號 | 網址 | 頁面 | 級別 |
|---|---|---|---|
| C-00 | `/` | 入口頁（線上訂位／我的預約／會員登入） | 基礎 |
| C-01 | `/t/:tableNo` | 掃碼進入 | 基礎 |
| C-04 | `/order/menu` | 菜單主頁（鍋底是其中一個分類） | 基礎 |
| C-05 | `/order/items/:id` | 品項詳情 | 基礎 |
| C-06 | `/order/cart` | 購物車（整桌共用） | 基礎 |
| C-07 | `/order/submitted` | 送出成功 | 基礎 |
| C-08 | `/order/tickets` | 本桌訂單 | 基礎 |
| C-09 | `/checkout` | 結帳明細 | 進階 A5 |
| C-10 | `/checkout/pay` | 付款方式 | 進階 A5 |
| C-11 | `/checkout/done` | 付款完成 | 進階 A5 |
| C-12 | `/auth` | 會員登入／註冊（輸入手機） | 基礎 |
| C-12b | `/auth/otp` | 輸入驗證碼 | 基礎 |
| C-13 | `/auth/register` | 會員註冊補資料 | 基礎 |
| C-14 | `/member` | 會員中心 | 基礎 |
| C-15 | `/member/history` | 消費紀錄 | 進階 A1 |
| C-20 | `/member/wallet` | 點數與優惠券 | 進階 A6 |
| C-16 | `/reserve` | 線上訂位入口（會員／匿名） | 基礎 |
| C-16b | `/reserve/guest` | 匿名訂位填資料 | 基礎 |
| C-16c | `/reserve/when` | 選日期時段人數（送出即成立） | 基礎 |
| C-18 | `/reserve/:id/done` | 訂位完成 | 基礎 |
| C-17 | `/reserve/:id/preorder` | 預先點餐／調整餐點 | 進階 A2 |
| C-19 | `/member/reservations` | 我的預約 | 基礎 |

- C-04b、C-04c（同桌通知）和 C-21（服務鈴面板）是蓋在畫面上的覆蓋層，**不是獨立路由**。
- **沒有「選鍋底」這一頁**：原本的 C-03 已經併進 C-04 的分類頁籤，「每桌至少一份鍋底」改成送出訂單時由後端擋（`400 SOUP_BASE_REQUIRED`）。C-02、C-03 是空號。
- 基礎版客人到櫃檯結帳，`/checkout` 開頭的三條只有做進階 A5 才要加。

店家端另一個專案：`/admin/login`、`/admin/tables`、`/admin/tables/:tableNo/open`（開桌，現場／候位／預約三個頁籤）、`/admin/tables/:tableNo`（桌位詳情）、`/admin/kitchen`、`/admin/menu`、`/admin/menu/options`、`/admin/reservations`、`/admin/tables-config`、`/admin/waitlist`；做進階才有 `/admin/inventory`（S-09）和 `/admin/reports`（S-12）。

## 15 分鐘動手小練習

```bash
npm install react-router-dom
```

```jsx
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';

function Home() {
  return (
    <div>
      <h1>菜單</h1>
      <Link to="/items/1">牛五花</Link> ｜ <Link to="/items/2">高麗菜</Link>
    </div>
  );
}

function Item() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <div>
      <h1>品項 #{id}</h1>
      <button onClick={() => navigate(-1)}>回上一頁</button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/items/:id" element={<Item />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**觀察重點**：點連結時**網址變了但畫面沒有閃白**。再按瀏覽器的上一頁，也正常運作。

## 你會遇到的坑

**① 用 `<a>` 而不是 `<Link>`**
整頁重新載入，狀態全沒了。

**② 忘記包 `<BrowserRouter>`**
`useNavigate` 之類的會噴錯。

**③ 部署後重新整理變 404**
你在 `/order/menu` 按 F5，伺服器去找 `/order/menu` 這個檔案——但那個檔案不存在。
→ **要設定「所有路徑都回傳 `index.html`」**。Vercel 和 Netlify 通常自動處理，但要確認。這在第 5 週部署時一定會遇到。

**④ `useParams` 拿到字串卻當數字用**

**⑤ 以為前端路由保護 = 安全**

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `useNavigate() may be used only in the context of a <Router>` | 沒包在 BrowserRouter 裡 | 檢查 main.jsx |
| `No routes matched location "/xxx"` | 沒有對應的路由 | 加一個 `path="*"` 的 404 頁 |
| 重新整理 404 | 伺服器沒設 SPA fallback | 部署設定加 rewrite 規則 |
| `Cannot read properties of undefined (reading 'id')` | useParams 名稱對不上 | 路由寫 `:id`，就要 `const { id } =` |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 整個網站只有一個 HTML | SPA（Single Page Application） |
| 看網址決定顯示什麼 | 路由 Routing |
| 網址裡的變數 | 路徑參數 `:id` |
| 子路由的出口 | `<Outlet />` |
| 所有路徑都回 index.html | SPA fallback / rewrite |

## 自我檢核

1. 為什麼不能用 `<a href="...">`？
2. 怎麼用程式跳到另一頁？
3. `useParams` 拿到的是什麼型別？
4. 部署後重新整理變 404，原因是什麼？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [React Router 官方文件](https://reactrouter.com/) | 英文 | 入門 | 30 分 |
| [React Router 中文教學（iThome）](https://ithelp.ithome.com.tw/articles/10268774) | 繁中 | 入門 | 20 分 |

## 相關頁面

[React 與 JSX](34-React與JSX.md)　[useEffect](37-useEffect.md)　[部署上線](../quality/50-部署上線.md)
