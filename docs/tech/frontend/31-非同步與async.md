# 非同步與 async/await

**難度** ★★★☆☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 1 週

## 一句話

「非同步」就是**叫了菜之後不用站在廚房等**，可以先去做別的事，菜好了再回來拿。

## 想像一下

你在火鍋店點了一份牛五花。

**同步（synchronous）的世界**：你站在廚房門口，什麼都不做，盯著鍋子，直到牛五花煮好。這段時間你不能喝飲料、不能聊天、不能加點。

**非同步（asynchronous）的世界**：你點完菜就回座位，繼續聊天喝飲料。服務生煮好了會端過來。

瀏覽器只有**一條執行緒**（一個服務生）。如果去跟後端要資料時卡住不動，**整個畫面會凍結**——按鈕點不動、動畫停住。

所以所有跟網路有關的事情都是非同步的。

## 三種寫法的演進

**① Callback（最舊，會變成地獄）**

```js
getMenu(function(menu) {
  getItem(menu[0].id, function(item) {
    getOptions(item.id, function(options) {
      // 巢狀三層了，還有錯誤處理要寫...
    });
  });
});
```

俗稱「回呼地獄」（callback hell），往右邊縮排到看不完。

**② Promise（中間版）**

```js
getMenu()
  .then(menu => getItem(menu[0].id))
  .then(item => getOptions(item.id))
  .then(options => console.log(options))
  .catch(err => console.error(err));
```

變平了，但還是有點囉唆。

**③ async / await（現在用這個）**

```js
try {
  const menu = await getMenu();
  const item = await getItem(menu[0].id);
  const options = await getOptions(item.id);
  console.log(options);
} catch (err) {
  console.error(err);
}
```

**看起來跟一般的程式碼一模一樣**，但實際上是非同步的。這就是 async/await 的價值。

## 兩個關鍵字

| 關鍵字 | 意思 |
|---|---|
| `async` | 貼在函式前面，宣告「這個函式裡面會有等待」 |
| `await` | 「等這件事做完再往下」。**只能用在 `async` 函式裡** |

```js
async function loadMenu() {          // ← 有 async 才能用 await
  const res = await fetch('/api/menu/items');
  const data = await res.json();
  return data;
}
```

## Promise 是什麼

Promise 是一張**「我等一下會給你結果」的承諾書**。它有三種狀態：

| 狀態 | 意思 |
|---|---|
| pending 等待中 | 還在處理 |
| fulfilled 成功 | 有結果了 |
| rejected 失敗 | 出錯了 |

`await` 的作用就是「**把承諾書換成真正的結果**」。

## 在我們的專案裡

```js
// src/api/client.js
export async function request(path, options = {}) {
  const res = await fetch(BASE + path, options);      // 等網路回來
  const data = await res.json();                       // 等 JSON 解析完
  if (!res.ok) {
    throw Object.assign(new Error(data.message), data);
  }
  return data;
}

// 在元件裡用
async function handleSubmit() {
  setLoading(true);
  try {
    const ticket = await request('/dining-sessions/me/orders', {
      method: 'POST',
      body: JSON.stringify({ items: cart }),
    });
    toast.success(`第 ${ticket.sequenceNo} 單已送出`);
    setCart([]);
  } catch (err) {
    if (err.code === 'ITEM_SOLD_OUT') {
      markSoldOutItems(err.details);
    } else {
      toast.error(err.message);
    }
  } finally {
    setLoading(false);        // ← 不管成功失敗都要關掉 loading
  }
}
```

**這段是整個前端最常出現的模式**：loading 開 → try 打 API → catch 處理錯誤 → finally 關 loading。

## 同時做好幾件事

如果三個請求互相沒關係，不要一個一個等：

```js
// ❌ 慢：要等 3 次
const menu = await getMenu();
const tables = await getTables();
const items = await getItems();

// ✅ 快：同時發，等最慢的那個
const [menu, tables, items] = await Promise.all([
  getMenu(), getTables(), getItems()
]);
```

## 15 分鐘動手小練習

在 Chrome Console 裡：

```js
// 1. 做一個「等 N 毫秒」的 Promise
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 2. 用 async/await 等它
async function test() {
  console.log('開始');
  await sleep(2000);
  console.log('兩秒後');
}
test();
console.log('這行會先印出來！');   // ← 注意順序

// 3. 真的打一支 API
async function getUser() {
  const res = await fetch('https://api.github.com/users/octocat');
  const data = await res.json();
  console.log(data.name, data.public_repos);
}
getUser();
```

**第 2 步的「這行會先印出來」是重點**——親眼看到「不等待、繼續往下」。

## 你會遇到的坑

**① 忘記 `await`**

```js
const data = fetch('/api/menu');       // ❌ data 是 Promise 物件，不是資料
console.log(data);                      // Promise { <pending> }
```

**② 在非 async 函式裡用 await**
語法錯誤。函式前面要加 `async`。

**③ `useEffect` 的函式不能直接 async**

```js
useEffect(async () => { ... }, []);     // ❌ React 會警告

useEffect(() => {                        // ✅ 裡面再開一個
  async function load() { ... }
  load();
}, []);
```

**④ 沒有 try-catch**
API 失敗時整個畫面白掉，使用者不知道發生什麼事。

**⑤ 忘記 `finally` 關 loading**
API 失敗了，但轉圈圈一直轉。

**⑥ 在迴圈裡 await**

```js
for (const id of ids) {
  await getItem(id);      // ❌ 10 個就等 10 次
}
const items = await Promise.all(ids.map(getItem));   // ✅
```

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Promise { <pending> }` | 你忘了 await | 加上 `await` |
| `await is only valid in async functions` | 函式沒標 async | 加上 `async` |
| `Uncaught (in promise) TypeError` | Promise 裡出錯但沒人接 | 加 try-catch 或 `.catch()` |
| `Cannot read properties of undefined` | 資料還沒回來就用了 | 加載入中狀態判斷 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 不用站著等 | 非同步 Asynchronous |
| 等一下會給你結果的承諾書 | Promise |
| 等它做完 | `await` |
| 這函式裡有等待 | `async` |
| 巢狀太多層 | Callback Hell 回呼地獄 |
| 同時做好幾件 | `Promise.all` |

## 自我檢核

1. 為什麼網路請求一定要非同步？
2. 忘記寫 `await` 會拿到什麼？
3. `useEffect` 裡要打 API 該怎麼寫？
4. 三個互不相關的請求，怎麼寫比較快？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [簡單理解 JavaScript Async 和 Await（OXXO.STUDIO）](https://www.oxxostudio.tw/articles/201908/js-async-await.html) | **繁中** | **入門** | 20 分 |
| [我要學會 JS：callback、Promise 和 async/await 那些事兒](https://noob.tw/js-async/) | 繁中 | 入門 | 25 分 |
| [JavaScript Promise 全介紹（卡斯伯）](https://www.casper.tw/development/2020/02/16/all-new-promise/) | 繁中 | 中階 | 30 分 |
| [Async function / Await 深度介紹（卡斯伯）](https://www.casper.tw/development/2020/10/16/async-await/) | 繁中 | 中階 | 30 分 |

## 相關頁面

[現代 JavaScript 速成](30-現代JavaScript.md)　[fetch 串接後端 API](40-fetch串接API.md)　[useEffect](37-useEffect.md)
