# useState

**難度** ★★☆☆☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 1 週

## 一句話

`useState` 就是**給元件一個會記住的變數，而且一改就重畫**。

## 為什麼不能用普通變數

```jsx
function Counter() {
  let count = 0;                                   // ❌ 沒用
  return <button onClick={() => count++}>{count}</button>;
}
```

兩個問題：

1. **畫面不會更新**——React 不知道你改了東西
2. **每次重畫都會歸零**——因為這個函式被重新執行，`count` 又變回 0

`useState` 同時解決這兩個問題：它把值存在 React 裡面（重畫也還在），而且改的時候會通知 React 重畫。

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

## 語法

```js
const [值, 改值的函式] = useState(初始值);
```

命名慣例：`[quantity, setQuantity]`、`[cart, setCart]`、`[loading, setLoading]`。

```jsx
const [quantity, setQuantity] = useState(1);              // 數字
const [note, setNote] = useState('');                     // 字串
const [loading, setLoading] = useState(false);            // 布林
const [cart, setCart] = useState([]);                     // 陣列（購物車：畫面上的那份，內容以後端為準）
const [session, setSession] = useState(null);             // 物件（還沒載入）
const [selectedOptions, setSelectedOptions] = useState({}); // 物件
```

## 最重要的規則：永遠產生新的

React 用「**是不是同一個東西**」來判斷要不要重畫。所以**不能改原本的，要做一個新的**。

**陣列**

```js
// 加一筆
setCart([...cart, newItem]);

// 刪掉某一筆
setCart(cart.filter(i => i.id !== targetId));

// 改其中一筆
setCart(cart.map(i => i.id === targetId ? { ...i, quantity: 3 } : i));
```

**物件**

```js
setForm({ ...form, nickname: '小明' });

// 巢狀的要一層一層展開
setSession({ ...session, table: { ...session.table, status: 'OCCUPIED' } });
```

**絕對不要**：`cart.push()`、`cart.splice()`、`form.name = 'x'`、`cart.sort()`。

（`sort` 也會改到原陣列！要先複製：`[...cart].sort()`）

## 用函式更新（連續改的時候）

```js
// ❌ 連按三次，只加 1
setCount(count + 1);
setCount(count + 1);
setCount(count + 1);

// ✅ 連按三次，加 3
setCount(prev => prev + 1);
setCount(prev => prev + 1);
setCount(prev => prev + 1);
```

原因：`setState` **不是馬上生效**。同一輪裡的 `count` 都還是舊值。

**規則：新值要根據舊值算出來的時候，一律用函式寫法。**

輪詢更新訂單列表時特別重要：

```js
setTickets(prev => mergeTickets(prev, newTickets));
```

## setState 是非同步的

```js
setCount(5);
console.log(count);      // 還是舊的值！
```

要拿更新後的值，用 [useEffect](37-useEffect.md) 監聽它。

## 我們專案的實際用法

```jsx
function ItemDetailPage() {
  const [item, setItem] = useState(null);           // 品項資料
  const [loading, setLoading] = useState(true);     // 載入中
  const [error, setError] = useState(null);         // 錯誤
  const [quantity, setQuantity] = useState(1);      // 數量
  const [selected, setSelected] = useState({});     // { 群組id: [選項id] }
  const [note, setNote] = useState('');             // 備註

  // 三態處理
  if (loading) return <Skeleton />;
  if (error)   return <ErrorState message={error.message} onRetry={reload} />;
  if (!item)   return <EmptyState />;

  // 單選群組
  const pickSingle = (groupId, valueId) =>
    setSelected(prev => ({ ...prev, [groupId]: [valueId] }));

  // 複選群組
  const toggleMulti = (groupId, valueId) =>
    setSelected(prev => {
      const list = prev[groupId] ?? [];
      return {
        ...prev,
        [groupId]: list.includes(valueId)
          ? list.filter(v => v !== valueId)
          : [...list, valueId],
      };
    });

  return ( ... );
}
```

**`loading` / `error` / 資料** 這三個 state 是每個要打 API 的頁面都會有的標準組合。

## 購物車：state 只是「畫面上的那一份」

我們的購物車**存在後端、整桌共用**：同桌每支手機看到同一份，誰都能加、改、刪（資料表是 [03-資料庫設計](../../spec/03-資料庫設計.md) 的 `cart_item`）。
所以 `cart` 這個 state 是**畫面狀態**——從後端抓回來、拿來畫畫面的那一份，**內容以後端為準**。

```jsx
import { fetchCart, updateCartItem } from '../services/api/cart';   // 見 fetch 那頁的 src/services/api/cart.js

function CartPage() {
  const [cart, setCart] = useState([]);           // 畫面狀態：整桌購物車的最新一份
  const [loading, setLoading] = useState(true);

  const reloadCart = useCallback(async () => {
    setCart(await fetchCart());                   // 以後端為準，整份換掉
    setLoading(false);
  }, []);

  useEffect(() => { reloadCart(); }, [reloadCart]);

  // 改數量：先打 API，成功再重抓
  const changeQty = async (id, quantity) => {
    await updateCartItem(id, { quantity });
    await reloadCart();
  };

  // 同桌別人加、改、刪 → 後端推 CART_UPDATED（帶整份購物車）→ 比對 version 後 setCart
  // （接法見「前端接 WebSocket」那頁）

  if (loading) return <Skeleton />;
  return <CartList items={cart} onChangeQty={changeQty} />;
}
```

**為什麼不直接 `setCart(prev => prev.map(...))` 就好？** 因為同桌另一支手機可能同時在改。只改自己畫面上的陣列，兩支手機就會各看到一個版本，按送出時後端送的又是資料庫裡那一份。

規則很簡單：**購物車那份陣列一律整份換掉，不要一列一列改。**
自己改完就重抓一次整份；同桌別人改的會由 `CART_UPDATED` 把整份推過來，比對版本後直接換掉。
（自己改的也會收到推播，一樣套用，只是 `change.byGuestId` 是自己，不跳通知條。）
上面那些 `filter`／`map` 的寫法還是天天會用（列表、篩選、把某一列標成「更新中」），只是不要拿本機陣列當真正的購物車。
相關：[fetch 串接後端 API](40-fetch串接API.md)、[前端接 WebSocket](../realtime/42-前端接WebSocket.md)。

> **例外：C-17 預先點餐（進階 A2）的購物車只存在這支手機。** 那時客人還沒到店、沒有用餐紀錄，後端共用購物車掛不上去；
> 這時 `cart` 就是真正的資料（用上面的 `filter`／`map` 改），按送出再整批 `PUT /api/reservations/{id}/preorder`。

## 15 分鐘動手小練習

做一個本機購物車，練習三種更新（純練習；專案裡的購物車存在後端，見上面「購物車」那段）：

```jsx
export default function App() {
  const [cart, setCart] = useState([
    { id: 1, name: '牛五花', qty: 1 },
    { id: 2, name: '高麗菜', qty: 2 },
  ]);

  const add = () => setCart(prev => [...prev, { id: Date.now(), name: '新品項', qty: 1 }]);
  const remove = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const changeQty = (id, delta) =>
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i));

  return (
    <div>
      {cart.map(i => (
        <div key={i.id}>
          {i.name}
          <button onClick={() => changeQty(i.id, -1)}>−</button>
          {i.qty}
          <button onClick={() => changeQty(i.id, +1)}>＋</button>
          <button onClick={() => remove(i.id)}>刪除</button>
        </div>
      ))}
      <button onClick={add}>新增一筆</button>
    </div>
  );
}
```

**然後把 `changeQty` 改成直接改**（`i.qty += delta`）試試看，確認畫面不會動。

## 你會遇到的坑

**① 直接改**（本頁核心，會犯三次以上）

**② 以為 setState 馬上生效**

**③ 忘記用函式寫法**
連續更新或輪詢合併時會出錯。

**④ 一個頁面 15 個 useState**
相關的可以合成一個物件，或考慮 `useReducer`（但我們專案用不到）。

**⑤ 把算得出來的東西存成 state**

```js
const [cart, setCart] = useState([]);
const [total, setTotal] = useState(0);      // ❌
const total = cart.reduce((s, i) => s + i.price * i.qty, 0);   // ✅
```

**⑥ 在條件式或迴圈裡呼叫 useState**

```js
if (x) { const [a, setA] = useState(0); }   // ❌ 絕對不行
```

**Hook 一定要寫在元件最上層，順序不能變。** 這是 React 的鐵律。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| 畫面就是不更新 | 直接改了 state | 用展開運算子 |
| `Too many re-renders` | 渲染中呼叫了 setState | `onClick={() => fn()}` |
| `React Hook "useState" is called conditionally` | Hook 寫在 if 裡 | 搬到最上層 |
| `Rendered more hooks than during the previous render` | Hook 數量變了 | 同上 |
| `Cannot read properties of null` | 初始值是 null，資料還沒回來 | 加 `if (!data) return <Skeleton />` |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 會記住又會重畫的變數 | State |
| React 提供的功能 | Hook |
| 產生新的而不是改原本的 | 不可變性 Immutability |
| 用舊值算新值 | functional update |
| 重新執行元件函式 | re-render 重新渲染 |

## 自我檢核

1. 為什麼不能用普通變數？
2. 為什麼 `cart.push()` 之後畫面不動？
3. 什麼時候要用 `setCount(prev => prev + 1)` 的寫法？
4. Hook 可以寫在 `if` 裡面嗎？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [React 官方繁中：State — 元件的記憶體](https://zh-hant.react.dev/learn/state-a-components-memory) | **繁中** | **入門** | 30 分 |
| [React 官方繁中：更新 State 中的物件](https://zh-hant.react.dev/learn/updating-objects-in-state) | 繁中 | 入門 | 20 分 |
| [React 官方繁中：更新 State 中的陣列](https://zh-hant.react.dev/learn/updating-arrays-in-state) | 繁中 | 入門 | 20 分 |

## 相關頁面

[Props 與 State](35-Props與State.md)　[useEffect](37-useEffect.md)　[現代 JavaScript 速成](30-現代JavaScript.md)
