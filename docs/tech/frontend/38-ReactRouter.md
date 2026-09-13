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
      <Route path="/t/:tableNo"      element={<TableEntryPage />} />
      <Route path="/order/soup-base" element={<SoupBasePage />} />
      <Route path="/order/menu"      element={<MenuPage />} />
      <Route path="/order/items/:id" element={<ItemDetailPage />} />
      <Route path="/order/cart"      element={<CartPage />} />
      <Route path="/order/tickets"   element={<TicketsPage />} />
      <Route path="/checkout"        element={<CheckoutPage />} />
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

function CartPage() {
  const navigate = useNavigate();

  async function handleSubmit() {
    const ticket = await request('/dining-sessions/me/orders', { ... });
    navigate('/order/tickets');                   // 送出後跳到訂單頁
  }

  return <button onClick={handleSubmit}>送出點餐</button>;
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
    <Route path="inventory"   element={<InventoryPage />} />
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

| 網址 | 頁面 |
|---|---|
| `/t/:tableNo` | 掃碼進入 |
| `/order/soup-base` | 選鍋底 |
| `/order/menu` | 菜單主頁 |
| `/order/items/:id` | 品項詳情 |
| `/order/cart` | 購物車 |
| `/order/tickets` | 本桌訂單 |
| `/checkout` | 結帳 |
| `/checkout/pay` | 付款 |
| `/member` | 會員中心 |
| `/reserve` | 訂位 |

店家端另一個專案：`/admin/tables`、`/admin/kitchen`、`/admin/menu`、`/admin/inventory`、`/admin/waitlist`。

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
