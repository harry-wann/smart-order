# useEffect

**難度** ★★★★☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 1 週

## 一句話

`useEffect` 是**「畫面畫完之後，順便做一件事」**——打 API、開計時器、連 WebSocket 都靠它。

> **這是 React 最容易寫錯的一個 Hook。** 建議真的要用的時候再回來看第二遍。

## 想像一下

元件的工作是「把畫面畫出來」。但有些事情不屬於畫畫面，例如：

- 進到這一頁時，去後端抓菜單
- 每 3 秒去問一次有沒有新的點餐單
- 進到這一頁時連上 WebSocket，離開時斷掉

這些叫「**副作用**」（side effect）——畫面以外的事。`useEffect` 就是放這些的地方。

## 語法

```jsx
useEffect(() => {
  // 要做的事
  return () => {
    // 清理（離開這個頁面時要做的）
  };
}, [依賴陣列]);
```

三個部分，每個都很重要。

## 依賴陣列決定「什麼時候跑」

| 寫法 | 什麼時候跑 | 用在哪 |
|---|---|---|
| `useEffect(fn, [])` | **只在第一次出現時跑一次** | 載入初始資料、連 WebSocket |
| `useEffect(fn, [id])` | 第一次 + **每次 `id` 變的時候** | 換品項就重新抓資料 |
| `useEffect(fn)` | **每次重畫都跑** ← 幾乎都是錯的 | 幾乎不用 |

**最常見的錯誤就是忘記寫 `[]`**，結果每次重畫都打一次 API，變成無限迴圈。

## 三個真實例子

**① 進頁面抓資料（三態齊全）**

```jsx
function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;                    // 防止元件已經消失還去 setState

    async function load() {
      try {
        setLoading(true);
        const data = await request('/menu/items');
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => { cancelled = true; };       // 清理
  }, []);                                     // 只跑一次

  if (loading) return <Skeleton />;
  if (error) return <ErrorState message={error.message} />;
  return <ItemList items={items} />;
}
```

**注意 `useEffect` 的函式本身不能是 async**，要在裡面另外開一個。

**② 輪詢（如果沒有用 WebSocket 的話）**

```jsx
useEffect(() => {
  const timer = setInterval(() => {
    if (document.visibilityState === 'visible') {   // 背景分頁就別問了
      refetchTickets();
    }
  }, 3000);

  return () => clearInterval(timer);          // ← 沒有這行就會一直累積計時器
}, []);
```

**③ 連 WebSocket（我們實際會用的）**

```jsx
useEffect(() => {
  const client = new Client({ brokerURL: WS_URL });

  client.onConnect = () => {
    client.subscribe(`/topic/session/${sessionId}`, (msg) => {
      const event = JSON.parse(msg.body);
      setTickets(prev => applyEvent(prev, event));
    });
    refetchAll();          // ★ 重連後一定要重抓一次完整資料
  };

  client.activate();

  return () => { client.deactivate(); };      // 離開頁面就斷線
}, [sessionId]);
```

## 清理函式為什麼重要

`return` 的那個函式會在兩個時機執行：

1. **元件消失時**（使用者換頁）
2. **依賴變化、effect 要重跑之前**

不寫清理會發生什麼：

| 沒清理 | 後果 |
|---|---|
| `setInterval` | 換頁後計時器還在跑，換十次頁就有十個計時器 |
| WebSocket | 連線一直累積，記憶體爆掉 |
| 事件監聽 | 同上 |
| 打到一半的 API | 元件消失了還去 setState，Console 警告 |

## React 18 的開發模式會跑兩次

在開發模式下，React 會**故意**把每個 effect 跑兩次（掛載→卸載→再掛載），目的是幫你抓出「沒寫清理函式」的 bug。

**看到 API 被打兩次不要驚慌**，正式版（`npm run build`）只會跑一次。如果跑兩次會出問題，那代表你的清理函式沒寫好。

## 15 分鐘動手小練習

```jsx
import { useState, useEffect } from 'react';

export default function App() {
  const [seconds, setSeconds] = useState(0);
  const [show, setShow] = useState(true);

  return (
    <div>
      <button onClick={() => setShow(!show)}>{show ? '隱藏' : '顯示'}計時器</button>
      {show && <Timer />}
    </div>
  );
}

function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    console.log('計時器啟動');
    const timer = setInterval(() => setSeconds(prev => prev + 1), 1000);
    return () => {
      console.log('計時器清掉');
      clearInterval(timer);
    };
  }, []);

  return <p>已經過 {seconds} 秒</p>;
}
```

1. 跑起來，看 console 印「計時器啟動」
2. 按「隱藏」→ 看到「計時器清掉」
3. **把 `return () => clearInterval(timer)` 那段註解掉**
4. 反覆按顯示／隱藏五次 → 再顯示時，數字會跳得超快（五個計時器同時在跑）

**第 4 步就是「沒清理」的後果**，親眼看過一次就忘不了。

## 你會遇到的坑

**① 忘記依賴陣列**

```jsx
useEffect(() => { fetchData(); });     // ❌ 每次重畫都打，無限迴圈
useEffect(() => { fetchData(); }, []); // ✅
```

**② 忘記清理**
計時器、連線、監聽器累積。

**③ effect 函式直接寫 async**

```jsx
useEffect(async () => { ... }, []);    // ❌
useEffect(() => { async function f(){...} f(); }, []);  // ✅
```

**④ 依賴裡放了每次都變的東西**

```jsx
useEffect(() => { ... }, [{ a: 1 }]);   // ❌ 每次都是新物件 → 每次都跑
```

**⑤ 用 useEffect 做「可以直接算」的事**

```jsx
const [total, setTotal] = useState(0);
useEffect(() => { setTotal(cart.reduce(...)); }, [cart]);   // ❌ 多此一舉

const total = cart.reduce(...);                              // ✅ 直接算
```

**「能在渲染時算出來的，就不要用 useEffect。」** 這是官方文件特別強調的一點。

**⑥ 在 effect 裡 setState 又把那個 state 放進依賴**
→ 無限迴圈。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| 瀏覽器卡死、Network 一直跳 | 無限迴圈 | 檢查依賴陣列 |
| `Can't perform a React state update on an unmounted component` | 元件消失了還 setState | 加 `cancelled` 旗標或清理函式 |
| `React Hook useEffect has a missing dependency` | ESLint 提醒少了依賴 | 補上，或確認真的不需要 |
| `Maximum update depth exceeded` | setState 觸發 effect 又 setState | 檢查依賴 |
| API 被打兩次 | React 18 開發模式故意的 | 正常，但確認清理函式有寫 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 畫面以外的事 | 副作用 Side Effect |
| 什麼時候要重跑 | 依賴陣列 dependency array |
| 離開時要做的事 | 清理函式 cleanup function |
| 元件出現 | mount 掛載 |
| 元件消失 | unmount 卸載 |

## 自我檢核

1. `useEffect(fn, [])` 和 `useEffect(fn)` 差在哪？
2. 清理函式什麼時候會執行？不寫會怎樣？
3. `useEffect` 的函式可以直接寫 async 嗎？
4. 購物車總額應該用 useEffect 算還是直接算？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [React 官方繁中：用 Effect 同步化](https://zh-hant.react.dev/learn/synchronizing-with-effects) | **繁中** | 中階 | 40 分 |
| [React 官方繁中：你可能不需要 Effect](https://zh-hant.react.dev/learn/you-might-not-need-an-effect) | **繁中** | 中階 | 40 分 |

> 第二篇特別重要——**新手最常見的毛病就是「什麼都塞進 useEffect」**。

## 相關頁面

[useState](36-useState.md)　[fetch 串接後端 API](40-fetch串接API.md)　[前端接 WebSocket](../realtime/42-前端接WebSocket.md)　[非同步與 async/await](31-非同步與async.md)
