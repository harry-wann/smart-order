# fetch 串接後端 API

**難度** ★★★☆☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 2 週

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
const res = await fetch('/api/dining-sessions/me/orders', {
  method: 'POST',                                    // ①
  headers: { 'Content-Type': 'application/json' },   // ②
  body: JSON.stringify({ items: cart }),             // ③ 要轉成字串
});
```

忘記 `Content-Type` → 後端回 415。忘記 `JSON.stringify` → 後端收到 `[object Object]`。

## 我們專案的統一封裝

**不要讓每個頁面各自寫 fetch。** 統一封裝在 `src/api/client.js`：

```js
const BASE = import.meta.env.VITE_API_BASE || '/api';

export async function request(path, { method = 'GET', body, auth = 'session' } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth === 'session') {
    const t = localStorage.getItem('sessionToken');
    if (t) headers['X-Session-Token'] = t;
  } else if (auth === 'jwt') {
    const t = localStorage.getItem('jwt');
    if (t) headers['Authorization'] = `Bearer ${t}`;
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

**這 30 行會省掉你們非常多重複的程式碼。** 而且錯誤處理集中在一個地方。

用起來：

```js
import { request } from '../api/client';

const items = await request('/menu/items?categoryId=2');
const ticket = await request('/dining-sessions/me/orders', {
  method: 'POST',
  body: { items: cart },
});
```

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
async function handleSubmit() {
  setSubmitting(true);
  try {
    const ticket = await request('/dining-sessions/me/orders', {
      method: 'POST', body: { items: cart },
    });
    toast.success(`第 ${ticket.sequenceNo} 單已送出`);
    setCart([]);
    navigate('/order/tickets');
  } catch (err) {
    switch (err.code) {
      case 'ITEM_SOLD_OUT':
        markSoldOut(err.details);                      // 標紅那幾項
        toast.error('部分品項已售完，請調整後重新送出');
        break;
      case 'SESSION_LOCKED':
        toast.error('結帳中無法加點');
        break;
      case 'INVALID_SESSION_TOKEN':
        localStorage.removeItem('sessionToken');
        navigate('/');                                  // 導回掃碼頁
        break;
      default:
        toast.error(err.message);
    }
  } finally {
    setSubmitting(true === false);                      // 記得關掉
  }
}
```

**後端的 `code` 就是給前端做這種判斷用的**（見 [04-API 規格](../../spec/04-API規格.md) 的錯誤碼表）。

## 防止重複送出

```jsx
<Button disabled={submitting} loading={submitting} onClick={handleSubmit}>
  送出點餐
</Button>
```

**沒有這個，客人連按三下就會送出三張單。** 這是驗收必測項。

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

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Failed to fetch` | 根本連不上 | 後端沒開、網址錯、或 CORS |
| `Unexpected token '<' ... is not valid JSON` | 後端回的是 HTML 不是 JSON | 網址打錯（多半回了 404 頁面） |
| `res.json is not a function` | 你把 response 當成資料用了 | 少了一層 |
| `415 Unsupported Media Type` | 沒帶 Content-Type | 加上 |
| `401` | token 沒帶或過期 | F12 看 Request Headers |
| 拿到 `Promise { <pending> }` | 忘了 await | 加上 |

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
