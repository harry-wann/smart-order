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
const [cart, setCart] = useState([]);                     // 陣列
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

## 15 分鐘動手小練習

做一個購物車，練習三種更新：

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
