# Props 與 State

**難度** ★★★☆☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 1 週

## 一句話

**Props 是別人給你的**（不能改），**State 是你自己的**（可以改，一改畫面就重畫）。

## 想像一下

你在餐廳當服務生。

- **Props** = 主管給你的「今日菜單」。你照著唸，但你不能自己改菜單。
- **State** = 你手上的「這一桌點了什麼」。這是你自己的本子，客人加點你就寫上去。

| | Props | State |
|---|---|---|
| 誰給的 | **父元件** | **自己** |
| 可以改嗎 | ❌ 唯讀 | ✅ 但要用 `setXxx` |
| 改了會重畫嗎 | 父元件改了會 | ✅ 會 |
| 比喻 | 函式的參數 | 元件自己的記憶 |

## Props：資料由上往下流

```jsx
// 父元件
function MenuPage() {
  const items = [{ id: 1, name: '牛五花', price: 280 }];
  return (
    <div>
      {items.map(item => (
        <MenuItemRow key={item.id} name={item.name} price={item.price} />
      ))}
    </div>
  );
}

// 子元件：只收、只顯示
function MenuItemRow({ name, price }) {
  return <div>{name} ${price}</div>;
}
```

**資料只能由上往下流。** 這叫「單向資料流」，React 的核心設計。

好處：出問題時你知道要往上找，不會有「到底是誰改了這個值」的謎團。

## State：元件自己的記憶

```jsx
import { useState } from 'react';

function Stepper() {
  const [quantity, setQuantity] = useState(1);     // 初始值 1

  return (
    <div>
      <button onClick={() => setQuantity(quantity - 1)}>−</button>
      <span>{quantity}</span>
      <button onClick={() => setQuantity(quantity + 1)}>＋</button>
    </div>
  );
}
```

**這是 React 最核心的一行**：

```js
const [值, 改值的函式] = useState(初始值);
```

按下 `＋` → 呼叫 `setQuantity` → React 知道狀態變了 → 自動重新執行這個元件函式 → 畫面更新。

## 子元件要怎麼「通知」父元件

Props 只能往下傳，那子元件按了按鈕怎麼告訴父元件？

**把函式當 prop 傳下去。**

```jsx
// 父元件：狀態和邏輯都在這
function MenuPage() {
  const [cart, setCart] = useState([]);

  function handleAdd(item) {
    setCart([...cart, item]);         // 用展開運算子產生新陣列
  }

  return items.map(item => (
    <MenuItemRow key={item.id} item={item} onAdd={handleAdd} />
  ));
}

// 子元件：只負責喊一聲
function MenuItemRow({ item, onAdd }) {
  return (
    <div>
      {item.name}
      <button onClick={() => onAdd(item)}>加入購物車</button>
    </div>
  );
}
```

**這是 React 最常見的模式**：狀態放在父元件，函式往下傳，子元件只負責觸發。

> 這裡為了專心練「函式往下傳」，`handleAdd` 直接改本機陣列。
> **我們專案的購物車存在後端、整桌共用**，實際的 `handleAdd` 是先打 API 加進去、再把整桌那份抓回來 `setCart`（見 [useState](36-useState.md) 的「購物車」那段）。函式往下傳的寫法完全一樣。

## 狀態該放在哪一層

規則：**放在「所有需要它的元件」的最近共同父元件上。**

我們的購物車例子：

```
OrderPage                    ← cart 狀態放這裡
├── MenuList                 （需要知道哪些加過了）
│   └── MenuItemRow          （要能加入）
└── CartBar                  （要顯示數量和金額）
```

`MenuItemRow` 和 `CartBar` 都需要 cart，所以放在 `OrderPage`。

（這個 `cart` 是從後端抓回來的畫面副本。同桌別人改了購物車，`OrderPage` 收到推播後整份換掉，兩個子元件跟著一起更新。）

**這叫「狀態提升」（lifting state up）。**

## 如果傳太多層怎麼辦

當狀態要傳五六層下去，中間的元件根本用不到卻要幫忙傳，這叫 **prop drilling（逐層鑽透）**，很煩。

解法是 **Context**：

```jsx
// 建立
const SessionContext = createContext();

// 在最上層提供
function App() {
  const [session, setSession] = useState(null);
  return (
    <SessionContext.Provider value={{ session, setSession }}>
      <Routes>...</Routes>
    </SessionContext.Provider>
  );
}

// 任何深度的元件都能直接拿
function CartBar() {
  const { session } = useContext(SessionContext);
  return <div>{session.tableNo} 桌</div>;
}
```

**我們專案只用 Context 放三種東西**：目前用餐的 session、登入的會員／員工、Toast 通知。

其他狀態一律用 `useState` + props。**不要裝 Redux**（見 [01-專案總覽](../../spec/01-專案總覽.md) 的技術限制）。

## 15 分鐘動手小練習

做一個購物車雛形：

```jsx
import { useState } from 'react';

function ItemRow({ item, onAdd }) {
  return (
    <div style={{ padding: 8 }}>
      {item.name} ${item.price}
      <button onClick={() => onAdd(item)} style={{ marginLeft: 8 }}>加入</button>
    </div>
  );
}

export default function App() {
  const items = [
    { id: 1, name: '麻辣鍋底', price: 480 },
    { id: 2, name: '牛五花', price: 280 },
  ];
  const [cart, setCart] = useState([]);

  const handleAdd = (item) => setCart([...cart, item]);
  const total = cart.reduce((s, i) => s + i.price, 0);

  return (
    <div>
      {items.map(i => <ItemRow key={i.id} item={i} onAdd={handleAdd} />)}
      <hr />
      <p>購物車 {cart.length} 項，共 ${total}</p>
    </div>
  );
}
```

**然後故意把 `handleAdd` 改成 `cart.push(item)` 試試看** ——畫面不會更新。這個對比一定要親眼看過。

## 你會遇到的坑

**① 直接改 state**

```js
cart.push(item);          // ❌ 畫面不會更新
setCart([...cart, item]); // ✅
```

**React 判斷「有沒有變」是看是不是同一個物件。** push 之後還是同一個陣列，React 以為沒變。

物件也一樣：

```js
setForm({ ...form, nickname: '小明' });   // ✅
```

**② 想改 props**

```js
function Row({ name }) {
  name = '新名字';    // ❌ 沒用，而且概念錯了
}
```

**③ 狀態放太下面**
兩個兄弟元件都需要同一份資料，但你各自放了一份 state，兩邊會不同步。
→ 提升到共同父元件。

**④ 狀態放太上面**
把所有東西都塞在 App 上，任何一個小改動都讓整頁重畫。

**⑤ 把「可以算出來的東西」也存成 state**

```js
const [cart, setCart] = useState([]);
const [total, setTotal] = useState(0);      // ❌ 多餘，而且會不同步

const total = cart.reduce(...);              // ✅ 直接算
```

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| 畫面就是不更新 | 你直接改了狀態 | 用展開運算子產生新的 |
| `Cannot assign to read only property` | 想改 props | props 是唯讀的 |
| `Too many re-renders` | 渲染中直接呼叫了 setState | `onClick={() => fn()}` 不是 `onClick={fn()}` |
| `Cannot update a component while rendering a different component` | 在渲染過程中改別人的狀態 | 搬到 `useEffect` 或事件處理函式裡 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 別人給的 | Props |
| 自己的記憶 | State |
| 資料只能往下流 | 單向資料流 |
| 把狀態搬到共同父元件 | 狀態提升 Lifting State Up |
| 一層層往下傳很煩 | Prop Drilling |
| 跨層共享 | Context |

## 自我檢核

1. Props 和 State 最大的差別是什麼？
2. 子元件要怎麼通知父元件？
3. 為什麼 `cart.push(item)` 之後畫面不會更新？
4. 兩個兄弟元件需要同一份資料，該怎麼辦？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [React 官方繁中：新增互動](https://zh-hant.react.dev/learn/adding-interactivity) | **繁中** | **入門** | 60 分 |
| [React 官方繁中：管理 State](https://zh-hant.react.dev/learn/managing-state) | 繁中 | 中階 | 60 分 |

## 相關頁面

[React 與 JSX](34-React與JSX.md)　[useState](36-useState.md)　[useEffect](37-useEffect.md)
