# 現代 JavaScript 速成

**難度** ★★☆☆☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 1 週

## 一句話

你們學過的 JavaScript 是「舊寫法」，React 用的是「新寫法」——概念沒變，只是語法更短。

## 為什麼要看這頁

你們學 JS 的時候大概是搭配 jQuery，寫法長這樣：

```js
var total = 0;
$('.item').each(function(i, el) {
  total = total + parseInt($(el).attr('data-price'));
});
```

React 的寫法長這樣：

```js
const total = items.reduce((sum, item) => sum + item.price, 0);
```

**做的是同一件事。** 但如果你不認識 `const`、箭頭函式、`reduce`，你會覺得那是外星文。

這頁把 React 裡會天天看到的新語法一次講完。

## ① `let` / `const` 取代 `var`

```js
const PRICE = 280;     // 不會再被改的東西
let count = 1;         // 會變的東西
count = 2;             // ✅
PRICE = 300;           // ❌ 報錯
```

**規則很簡單：預設都用 `const`，真的需要改再用 `let`，永遠不要用 `var`。**

> `const` 的「不能改」是指「不能換成另一個東西」。物件裡面的內容還是可以改：
> ```js
> const cart = [];
> cart.push('牛五花');   // ✅ 可以，因為 cart 還是同一個陣列
> cart = [];             // ❌ 不行，你想換成新的陣列
> ```

## ② 箭頭函式

```js
// 舊寫法
function add(a, b) {
  return a + b;
}

// 新寫法
const add = (a, b) => a + b;
```

規則：
- 只有一個參數可以省括號：`x => x * 2`
- **只有一行 return 可以省 `return` 和大括號**
- 多行就要大括號和 return：

```js
const calc = (item) => {
  const base = item.price * item.quantity;
  return base + item.optionsPrice;
};
```

## ③ 樣板字串（用反引號）

```js
// 舊
var msg = '第 ' + n + ' 單，共 ' + total + ' 元';

// 新
const msg = `第 ${n} 單，共 ${total} 元`;
```

用**反引號**（鍵盤左上角那個 `` ` ``），變數放進 `${}`。還可以換行。

## ④ 解構

從物件或陣列裡「拆」出東西：

```js
const item = { id: 12, name: '牛五花', price: 280 };

// 舊
var name = item.name;
var price = item.price;

// 新
const { name, price } = item;
```

**React 裡到處都是這個寫法**：

```js
function MenuItemRow({ name, price, soldOut }) {   // 直接從 props 拆出來
  return <div>{name} ${price}</div>;
}
```

## ⑤ 展開運算子 `...`

**複製一份並加東西**——React 裡最重要的語法之一。

```js
const cart = [{ id: 1 }, { id: 2 }];

// 加一筆（產生新陣列，不改原本的）
const newCart = [...cart, { id: 3 }];

// 物件也一樣
const item = { id: 12, quantity: 1 };
const updated = { ...item, quantity: 2 };    // { id: 12, quantity: 2 }
```

**為什麼不直接 `cart.push()`？** 因為 React 判斷「要不要重畫」是看**物件是不是同一個**。你 push 進去，還是同一個陣列，React 會以為沒變，畫面不會更新。

這是 React 新手最常見的 bug。詳見 [useState](36-useState.md)。

## ⑥ 三個陣列方法（React 裡天天用）

```js
const items = [
  { name: '牛五花', price: 280, soldOut: false },
  { name: '羊肉',   price: 320, soldOut: true },
  { name: '高麗菜', price: 80,  soldOut: false },
];

// map —— 一個變一個（畫清單就靠它）
const names = items.map(item => item.name);
// ['牛五花', '羊肉', '高麗菜']

// filter —— 挑出符合條件的
const available = items.filter(item => !item.soldOut);
// 兩筆

// reduce —— 全部濃縮成一個值（算總額）
const total = items.reduce((sum, item) => sum + item.price, 0);
// 680
```

**`map` 是 React 裡出現最多次的方法**，因為畫清單就是 `資料.map(變成畫面)`：

```jsx
{items.map(item => <MenuItemRow key={item.id} {...item} />)}
```

## ⑦ 可選鏈 `?.` 和空值合併 `??`

```js
// 舊寫法：怕 category 是 null
const name = item && item.category && item.category.name;

// 新寫法
const name = item?.category?.name;          // 中間任何一層是 null 就回 undefined

// 給預設值
const display = item?.category?.name ?? '未分類';
```

**串 API 時超好用**，因為後端可能回 null。

## ⑧ import / export

```js
// Button.jsx
export default function Button({ children }) { ... }
export const SIZES = ['sm', 'md', 'lg'];

// 別的檔案
import Button, { SIZES } from './components/Button';
```

`default` 的那個 import 時不用大括號，其他的要。

## 15 分鐘動手小練習

打開 Chrome F12 的 Console，把這些一行一行貼進去跑：

```js
const items = [
  { name: '牛五花', price: 280, qty: 2 },
  { name: '高麗菜', price: 80,  qty: 1 },
];

// 1. 用 map 做出 ['牛五花 x2', '高麗菜 x1']
items.map(i => `${i.name} x${i.qty}`)

// 2. 用 reduce 算總金額
items.reduce((sum, i) => sum + i.price * i.qty, 0)

// 3. 用展開運算子加一筆，且不改變原本的 items
const newItems = [...items, { name: '王子麵', price: 30, qty: 1 }];
console.log(items.length, newItems.length);   // 2 3

// 4. 解構
const { name, price } = items[0];
console.log(name, price);
```

**第 3 題最重要**——確認 `items` 真的沒被改到。

## 你會遇到的坑

**① 用 `push` 改陣列然後畫面不更新**
React 的頭號地雷。要用 `[...舊的, 新的]`。

**② 箭頭函式忘記 return**

```js
const f = (x) => { x * 2 };      // ❌ 回傳 undefined
const f = (x) => x * 2;          // ✅
const f = (x) => { return x * 2; }; // ✅
```

**③ `map` 忘記 `key`**
React 會警告。`key` 要用穩定的唯一值（通常是 id），**不要用陣列索引**。

**④ 分不清 `=` 和 `===`**
JS 裡比較一律用 `===`（嚴格相等）。`==` 會做奇怪的型別轉換。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Cannot read properties of undefined (reading 'xxx')` | 你對一個不存在的東西取屬性 | 用 `?.`，或檢查資料到底有沒有回來 |
| `x is not a function` | 你把不是函式的東西當函式呼叫 | 拼字錯，或 import 錯 |
| `Assignment to constant variable` | 想改 `const` | 改用 `let`，或用展開運算子產生新的 |
| `Unexpected token` | 語法錯 | 多半是括號或大括號沒配對 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 新寫法 | ES6+ / ECMAScript 2015 以後 |
| 箭頭函式 | Arrow Function |
| 反引號字串 | Template Literal 樣板字面值 |
| 拆出來 | Destructuring 解構 |
| 三個點 | Spread / Rest Operator |
| `?.` | Optional Chaining 可選鏈 |
| `??` | Nullish Coalescing 空值合併 |

## 自我檢核

1. `const` 宣告的陣列可以 `push` 嗎？為什麼？
2. 為什麼 React 裡不能用 `push` 改狀態？
3. `map`、`filter`、`reduce` 各做什麼？
4. `item?.category?.name` 的 `?.` 是什麼意思？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [MDN：JavaScript 第一步](https://developer.mozilla.org/zh-TW/docs/Learn_web_development/Core/Scripting) | 繁中 | 入門 | 60 分 |
| [OXXO.STUDIO JavaScript 教學](https://www.oxxostudio.tw/articles/201908/js-async-await.html) | 繁中 | 入門 | 查用 |

## 相關頁面

[非同步與 async/await](31-非同步與async.md)　[React 與 JSX](34-React與JSX.md)　[useState](36-useState.md)
