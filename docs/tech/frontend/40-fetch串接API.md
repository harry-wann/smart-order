# fetch 串接後端 API

**難度** ★★★☆☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 1 週（接 mock）、第 3 週（換成真的）

## 一句話

`fetch` 是瀏覽器內建的「**去跟後端要資料**」的功能。

## 最小的例子

```js
const res = await fetch('http://localhost:8080/api/menu/items');
const data = await res.json();
console.log(data);
```

**兩個 `await`**，很多人會漏掉第二個：

1. 第一個等**網路回來**（拿到 response 物件）
2. 第二個等**把內容解析成 JSON**

## 兩個大坑

**① `fetch` 遇到 4xx / 5xx 不會丟錯誤**

```js
const res = await fetch('/api/menu/items/99999');   // 後端回 404
// 上面這行「成功」了！不會進 catch
if (!res.ok) { ... }                                 // 要自己檢查
```

`res.ok` 是 `status` 在 200–299 之間才 true。**`fetch` 只有在網路真的連不上時才會 reject。**

**② POST 要自己設定三件事**

```js
// 加一份牛五花到購物車
const res = await fetch('/api/dining-sessions/me/cart/items', {
  method: 'POST',                                    // ①
  headers: { 'Content-Type': 'application/json' },   // ②
  body: JSON.stringify({ menuItemId: 12, quantity: 1, optionValueIds: [], note: '' }),  // ③ 要轉成字串
});
```

忘記 `Content-Type` → 後端回 415。忘記 `JSON.stringify` → 後端收到 `[object Object]`。

## 我們專案的統一封裝

**不要讓每個頁面各自寫 fetch。** 統一封裝在 `src/api/client.js`：

```js
const BASE = import.meta.env.VITE_API_BASE || '/api';

// 三種憑證，各對應一個標頭
const CREDENTIALS = {
  session:     () => ['X-Session-Token',     localStorage.getItem('sessionToken')],      // 用餐權杖（掃碼加入時拿到）
  jwt:         () => ['Authorization',       bearer(localStorage.getItem('jwt'))],       // 會員或員工登入
  reservation: () => ['X-Reservation-Token', localStorage.getItem('reservationToken')],  // 匿名訂位權杖（建立訂位時拿到）
};
const bearer = (t) => (t ? `Bearer ${t}` : null);

// 這支手機的裝置代號：第一次開啟時產生，存在 localStorage。
// 只拿來標示整桌購物車裡「誰加的」，不是身分驗證（驗證還是靠 X-Session-Token）
function deviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    // crypto.randomUUID 只在 https 或 localhost 能用；手機連電腦區網 IP（http://192.168…）測試時沒有它
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem('deviceId', id);
  }
  return id;
}

export async function request(path, { method = 'GET', body, auth = 'session' } = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-Device-Id': deviceId() };

  // auth 可以是一個字串，也可以是陣列（同時帶好幾種），例如 ['session', 'jwt']；null 表示都不帶
  for (const kind of [].concat(auth ?? [])) {
    const [name, value] = CREDENTIALS[kind]();
    if (value) headers[name] = value;
  }

  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw Object.assign(new Error('連線失敗，請檢查網路'), { code: 'NETWORK_ERROR' });
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // 統一的錯誤物件：頁面只要看 err.code
    throw Object.assign(new Error(data.message || '發生錯誤'), data);
  }
  return data;
}
```

**這幾十行會省掉你們非常多重複的程式碼。** 而且錯誤處理集中在一個地方。

`auth` 的寫法（三種標頭對照 [04-API 規格](../../spec/04-API規格.md) §1.4）：

| `auth` | 帶哪個標頭 | 用在哪 |
|---|---|---|
| `'session'`（預設） | `X-Session-Token` | 購物車、送出點餐、服務鈴、本桌訂單 |
| `'jwt'` | `Authorization: Bearer …` | 會員中心、我的預約、店家端全部 |
| `'reservation'` | `X-Reservation-Token` | 匿名客人在 C-19 查看、取消自己的訂位 |
| `['session', 'jwt']` | 兩個都帶 | 進階 8.10「這次消費記到會員」（`attach-member`） |
| `null` | 都不帶 | 查桌位狀態、菜單、訂位空位 |

匿名訂位的權杖在建立訂位成功時存起來：`localStorage.setItem('reservationToken', res.accessToken)`。

另外**每個請求都帶 `X-Device-Id`**（上面的 `deviceId()`）。後端在掃碼加入（`join`）時用它建立一筆「同桌客人」，給一個顯示名稱（有登入會員用暱稱，否則依加入順序「客人 1」「客人 2」…），購物車每一列的「陳小美 加的」就是這樣來的。
它**不是**權限，被偽造頂多顯示錯名字；能不能動這桌的購物車，看的還是 `X-Session-Token`。

用起來：

```js
import { request } from '../api/client';

const items = await request('/menu/items?categoryId=2', { auth: null });   // 菜單公開讀取
// 匿名客人取消自己的訂位（C-19）
await request(`/reservations/${id}`, { method: 'DELETE', auth: 'reservation' });
```

### 購物車的 API 也包一層

購物車**存在後端、整桌共用**（同桌每支手機看到同一份）。頁面不要自己拼網址，統一放在 `src/api/cart.js`：

```js
// src/api/cart.js
import { request } from './client';

// GET /me/cart 回 { items, totalQuantity, subtotal }，每個 item 有 addedBy: { guestId, displayName }（誰加的）
// totalQuantity 是份數加總（白飯 ×2 算 2），不是列數
// 這裡只取品項陣列；角標、合計要用的話，改成回整包再拿 totalQuantity、subtotal
export const fetchCart      = async () => (await request('/dining-sessions/me/cart')).items;
export const addToCart      = (body) => request('/dining-sessions/me/cart/items', { method: 'POST', body });
export const updateCartItem = (id, body) => request(`/dining-sessions/me/cart/items/${id}`, { method: 'PATCH', body });
export const removeCartItem = (id) => request(`/dining-sessions/me/cart/items/${id}`, { method: 'DELETE' });
// 送出點餐：不帶品項，後端直接把整桌購物車變成一張點餐單，再把購物車清空
export const submitCart     = () => request('/dining-sessions/me/orders', { method: 'POST' });
```

```js
// C-05 品項詳情按「加入購物車」
await addToCart({ menuItemId: 12, quantity: 2, optionValueIds: [31, 41], note: '不要太熟' });
```

加入、修改、刪除成功後，同桌其他手機會收到 `CART_UPDATED`，各自重抓（見 [前端接 WebSocket](../realtime/42-前端接WebSocket.md)）。

## 在元件裡的標準寫法

```jsx
function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await request('/menu/items'));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Skeleton />;
  if (error)   return <ErrorState message={error.message} onRetry={load} />;
  if (!items.length) return <EmptyState text="這個分類還沒有品項" />;

  return <ItemList items={items} />;
}
```

**三態（載入中／錯誤／空資料）是每個頁面都必須處理的**，這是我們的完成定義之一。

## 錯誤怎麼分別處理

```js
import { submitCart, fetchCart } from '../api/cart';

async function handleSubmit() {
  setSubmitting(true);
  try {
    const ticket = await submitCart();                  // 不帶品項：整桌購物車一起送出
    toast.success(`第 ${ticket.sequenceNo} 單已送出`);
    navigate('/order/tickets');                         // 不用 setCart([])：後端在同一個交易裡清掉了購物車
  } catch (err) {
    switch (err.code) {
      case 'CART_EMPTY':                                // 409：同桌另一個人剛好先送出了
        toast.error('購物車是空的，可能同桌已經送出了');
        setCart(await fetchCart());                     // 重抓，畫面變成空的購物車
        break;
      case 'ITEM_SOLD_OUT':
        markSoldOut(err.details);                      // 標紅那幾項
        toast.error('部分品項已售完，請調整後重新送出');
        break;
      case 'SESSION_CLOSED':                            // 這桌已經收場（err.reason：PAID 或 CANCELLED）
        localStorage.removeItem('sessionToken');
        if (err.reason === 'CANCELLED') {
          navigate('/');                                // 店長取消了這次用餐：不顯示面板，直接回 C-00
        } else {
          toast.error('這桌已經結帳，不能再加點');
          setClosed(true);                              // 菜單切到「已結帳」面板，按「回到首頁」到 C-00
        }
        break;
      case 'INVALID_SESSION_TOKEN':                     // 權杖已失效（這桌結清或取消了）
        localStorage.removeItem('sessionToken');
        navigate('/');                                  // 回 C-00 首頁；客人再掃桌上 QR 時，
        break;                                          // C-01 依桌位狀態顯示（剛結清是「整理中，請稍候」）
      default:
        toast.error(err.message);
    }
  } finally {
    setSubmitting(false);                               // 記得關掉
  }
}
```

**後端的 `code` 就是給前端做這種判斷用的**（見 [04-API 規格](../../spec/04-API規格.md) 的錯誤碼表）。

## 防止重複送出

```jsx
<Button disabled={submitting} loading={submitting} onClick={handleSubmit}>
  送出整桌點餐
</Button>
```

**沒有這個，客人連按三下，後兩下會跳出「購物車是空的」**（後端的列鎖讓三筆排隊，第一筆送出後購物車就空了，不會變成三張單，但畫面很難看）。
「加入購物車」「櫃檯結清」這類按鈕沒有這層保護，連按就真的會重複加、重複送。**每個會寫資料的按鈕都要做**，這是驗收必測項。

## 15 分鐘動手小練習

```js
// 1. 在 Console 練一次成功的
const res = await fetch('https://api.github.com/users/octocat');
console.log(res.ok, res.status);
console.log(await res.json());

// 2. 練一次失敗的 —— 注意它不會丟錯誤
const bad = await fetch('https://api.github.com/users/這個人不存在xyz123');
console.log(bad.ok, bad.status);     // false 404 ← 但沒有進 catch！

// 3. 練 POST
const post = await fetch('https://httpbin.org/post', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ hello: '火鍋' }),
});
console.log(await post.json());
```

**第 2 步是本頁最重要的認知。**

## 你會遇到的坑

**① 沒檢查 `res.ok`**
404 也當成功處理，然後畫面顯示 undefined。

**② 忘記第二個 `await res.json()`**
拿到 Promise 物件。

**③ 忘記 `JSON.stringify`**

**④ CORS 錯誤**
第一次串一定會遇到，去看 [CORS](../web/11-CORS跨來源.md)。

**⑤ 每個頁面各自寫 fetch**
錯誤處理不一致、token 有的帶有的沒帶、改 API 網址要改二十個地方。

**⑥ 沒處理重複送出**

**⑦ 在 `useEffect` 裡沒做清理**
元件消失了資料才回來，setState 會警告。

**⑧ 購物車只改本機陣列**
同桌另一支手機看到的是另一個版本。→ 購物車以後端為準，改完或收到 `CART_UPDATED` 就重抓。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Failed to fetch` | 根本連不上 | 後端沒開、網址錯、或 CORS |
| `Unexpected token '<' ... is not valid JSON` | 後端回的是 HTML 不是 JSON | 網址打錯（多半回了 404 頁面） |
| `res.json is not a function` | 你把 response 當成資料用了 | 少了一層 |
| `415 Unsupported Media Type` | 沒帶 Content-Type | 加上 |
| `401` | token 沒帶或過期 | F12 看 Request Headers |
| 拿到 `Promise { <pending> }` | 忘了 await | 加上 |
| `crypto.randomUUID is not a function` | 不是 https 也不是 localhost（例如手機連 `http://192.168…`） | 用 `deviceId()` 裡的備用寫法 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 去跟後端要資料 | fetch / API 請求 |
| 後端回來的整包東西 | Response |
| 狀態在 200～299 | `res.ok` |
| 把內容解析成物件 | `res.json()` |
| 統一封裝 | API client |
| 載入中／錯誤／空資料 | 三態處理 |

## 自我檢核

1. `fetch` 收到 404 會進 catch 嗎？
2. 為什麼要寫兩個 `await`？
3. POST 要設定哪三件事？
4. 為什麼不要每個頁面各自寫 fetch？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [MDN：使用 Fetch](https://developer.mozilla.org/zh-TW/docs/Web/API/Fetch_API/Using_Fetch) | 繁中 | 入門 | 25 分 |
| 我們的 [04-API 規格](../../spec/04-API規格.md) | 繁中 | 入門 | 30 分 |

## 相關頁面

[非同步與 async/await](31-非同步與async.md)　[useEffect](37-useEffect.md)　[CORS 跨來源問題](../web/11-CORS跨來源.md)　[JWT 與登入狀態](../backend/21-JWT.md)
