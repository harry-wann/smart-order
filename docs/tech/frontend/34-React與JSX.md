# React 與 JSX

**難度** ★★★☆☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 1 週

## 一句話

React 的核心觀念是：**你不去改畫面，你只改資料，畫面自己會變。**

## 你們熟悉的 jQuery 思維

```js
// 加一項到購物車
$('#cart-list').append('<li>牛五花 x2</li>');
$('#cart-count').text(count + 1);
$('#cart-total').text(total + 560);
$('#cart-bar').show();
```

**你在「指揮畫面怎麼改」。** 每個要變的地方都要自己去抓、自己去改。

問題是：畫面一複雜，你要記得「加一項的時候有哪五個地方要跟著變」。漏掉一個就是 bug。

## React 的思維

```jsx
// 只改資料
setCart([...cart, { name: '牛五花', quantity: 2, price: 280 }]);
```

**就這一行。** 數量、總額、購物車列表、底部橫條——全部自己變。

（我們專案的購物車其實存在後端、整桌共用，資料是打 API 抓回來再 `setCart`；但「只改資料、畫面自己變」這件事完全一樣。）

因為你在別的地方已經描述過「**畫面應該長什麼樣子**」：

```jsx
<div>
  <ul>
    {cart.map(item => <li key={item.id}>{item.name} x{item.quantity}</li>)}
  </ul>
  <span>{cart.length} 項</span>
  <span>${cart.reduce((s, i) => s + i.price * i.quantity, 0)}</span>
</div>
```

React 會自動算出「資料變了之後畫面該長怎樣」，然後只改真正需要改的部分。

**這個思維轉換是 React 最難的地方。** 想清楚這一點，剩下的都是語法。

## 元件是什麼

元件就是**一個會回傳畫面的函式**。

```jsx
function MenuItemRow({ name, price, soldOut }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <img src="/beef.jpg" alt={name} className="w-20 h-20 rounded-xl" />
      <div>
        <h3 className="text-lg font-bold">{name}</h3>
        <p className="text-brand-600 text-xl font-bold">${price}</p>
      </div>
      {soldOut && <span className="badge-soldout">售完</span>}
    </div>
  );
}
```

用起來像 HTML 標籤：

```jsx
<MenuItemRow name="美國牛五花" price={280} soldOut={false} />
```

**規則：元件名稱一定要大寫開頭。** 小寫的 React 會當成一般 HTML 標籤。

## JSX 的七條規則

JSX 就是「寫在 JS 裡面的 HTML」。它很像 HTML 但有幾個不同：

**① `class` 要寫 `className`**（因為 `class` 是 JS 保留字）

```jsx
<div className="card">   ✅
<div class="card">       ❌
```

**② 標籤一定要關**

```jsx
<img src="x.jpg" />      ✅
<br />                   ✅
<img src="x.jpg">        ❌
```

**③ 只能回傳一個根元素**

```jsx
// ❌ 兩個並排
return <div>A</div><div>B</div>;

// ✅ 包起來
return <><div>A</div><div>B</div></>;    // <> </> 是「空標籤」
```

**④ 放變數用大括號**

```jsx
<h3>{item.name}</h3>
<p>共 {adultCount + childCount} 位</p>
<img src={item.imageUrl} />
```

**⑤ 條件顯示**

```jsx
{soldOut && <span>售完</span>}                    {/* 有才顯示 */}
{soldOut ? <span>售完</span> : <button>加入</button>}   {/* 二選一 */}
```

**⑥ 畫清單用 `map`，而且要 `key`**

```jsx
{items.map(item => (
  <MenuItemRow key={item.id} {...item} />
))}
```

`key` 要用**穩定的唯一值**（通常是 id）。用陣列索引會在排序或刪除時出錯。

**⑦ 註解要寫在大括號裡**

```jsx
{/* 這是註解 */}
```

## Props：從外面傳進來的資料

```jsx
// 定義
function Button({ variant = 'primary', size = 'lg', children, onClick }) {
  return <button className={`btn-${variant} btn-${size}`} onClick={onClick}>{children}</button>;
}

// 使用
<Button variant="secondary" onClick={handleAdd}>加入購物車</Button>
```

`children` 是特殊的 prop，代表「標籤中間夾的東西」。

**Props 是唯讀的。** 子元件不能改父元件傳來的東西。

## 事件處理

```jsx
<button onClick={handleClick}>送出</button>              ✅ 傳函式
<button onClick={handleClick()}>送出</button>            ❌ 這是「馬上執行」
<button onClick={() => handleAdd(item.id)}>加入</button>  ✅ 要帶參數就包一層
```

**這是新手第一天最常犯的錯**：`onClick={handleClick()}` 會在畫面一載入就執行。

## 15 分鐘動手小練習

在 Vite 專案裡，把 `src/App.jsx` 換成：

```jsx
function MenuItemRow({ name, price, soldOut }) {
  return (
    <div style={{ padding: 12, borderBottom: '1px solid #E6DED2', opacity: soldOut ? 0.5 : 1 }}>
      <strong>{name}</strong> — ${price}
      {soldOut && <span style={{ color: '#B3261E' }}> 售完</span>}
    </div>
  );
}

export default function App() {
  const items = [
    { id: 1, name: '麻辣鍋底', price: 480, soldOut: false },
    { id: 2, name: '美國牛五花', price: 280, soldOut: false },
    { id: 3, name: '紐西蘭羊肉', price: 320, soldOut: true },
  ];

  return (
    <div style={{ maxWidth: 375, margin: '0 auto' }}>
      <h1>今日菜單</h1>
      {items.map(item => <MenuItemRow key={item.id} {...item} />)}
      <p>共 {items.length} 項，{items.filter(i => !i.soldOut).length} 項可點</p>
    </div>
  );
}
```

**練習重點**：把 `soldOut` 改成 true/false，看畫面跟著變。你完全沒有去「改畫面」，只是改資料。

## 你會遇到的坑

**① `onClick={fn()}` 而不是 `onClick={fn}`**
畫面一載入就執行。

**② 元件名稱小寫**
`<menuItemRow />` React 會當成不認識的 HTML 標籤，畫面一片空白。

**③ 忘記 `key`**
Console 會警告，而且排序／刪除時畫面會錯亂。

**④ 用 `class` 而不是 `className`**

**⑤ 想回傳兩個並排的元素**
要用 `<>...</>` 包起來。

**⑥ 還在用 jQuery 思維**
`document.getElementById('x').innerText = '...'` ——**React 裡不要這樣做。** 改資料就好。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Adjacent JSX elements must be wrapped in an enclosing tag` | 回傳了兩個並排元素 | 用 `<>...</>` |
| `Each child in a list should have a unique "key" prop` | map 忘了 key | 加 `key={item.id}` |
| `Objects are not valid as a React child` | 你把物件直接放進 JSX | 要放字串或數字，例如 `{item.name}` |
| `xxx is not defined` | 變數或元件沒 import | 檢查 import |
| `Too many re-renders` | 在渲染時直接呼叫了 setState | `onClick={fn}` 不是 `fn()` |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 會回傳畫面的函式 | 元件 Component |
| 寫在 JS 裡的 HTML | JSX |
| 從外面傳進來的資料 | Props |
| 標籤中間夾的東西 | `children` |
| 空標籤 `<>` | Fragment |
| 改資料畫面自己變 | 宣告式 Declarative |
| 自己指揮畫面改 | 命令式 Imperative（jQuery 的做法） |

## 自我檢核

1. React 跟 jQuery 最根本的差別是什麼？
2. `onClick={handleClick}` 和 `onClick={handleClick()}` 差在哪？
3. 為什麼 map 要加 `key`？可以用陣列索引嗎？
4. JSX 裡為什麼要寫 `className` 不是 `class`？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [React 官方繁中文件：快速入門](https://zh-hant.react.dev/learn) | **繁中** | **入門** | 60 分 |
| [React 官方繁中：描述 UI](https://zh-hant.react.dev/learn/describing-the-ui) | 繁中 | 入門 | 60 分 |

> **這是前端最重要的一頁。** D 和 E 第 1 週務必把官方繁中文件的「快速入門」和「描述 UI」兩章做完，其他三位也建議至少看「快速入門」。

## 相關頁面

[現代 JavaScript 速成](30-現代JavaScript.md)　[Props 與 State](35-Props與State.md)　[useState](36-useState.md)　[Tailwind CSS](39-Tailwind.md)
