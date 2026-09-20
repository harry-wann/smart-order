# 前端接 WebSocket

**難度** ★★★☆☆　**用在哪些模組** M2、M3、M4、M5、M6　**哪幾週** 第 2 週（假事件）、第 4 週

## 一句話

用 `@stomp/stompjs` 接上後端的喇叭，收到訊息就更新畫面。

## 檔案放哪裡

**所有 WebSocket 相關的程式碼都放在 `src/services/realtime/`**，元件裡不准直接 `new WebSocket`。

```
src/services/realtime/
└── socket.js       ← 連線、重連、訂閱頻道
```

**沒有假的 WebSocket。** 連的一律是真的後端；要演即時效果，
請後端開一支開發用端點手動觸發推播（[05 §1.4.4](../../spec/05-開發流程與分工.md)）。

判斷方法是**「誰先開口」**：後端主動推給前端的放這裡；
前端問一次、後端答一次的放 `src/services/api/`，
見 [fetch 串接後端 API](../frontend/40-fetch串接API.md)。

> **兩邊常常配成一對。** 每個事件怎麼接不一樣，看 [04 §3.4](../../spec/04-API規格.md) 那張表。
> 購物車的 `CART_UPDATED` 直接帶整份購物車，本頁「同桌共用購物車」那一節就是它的做法。

## 要裝什麼

```bash
npm install @stomp/stompjs
```

> 不需要 `sockjs-client`：後端開的是原生 WebSocket 端點 `/ws`（見 [WebSocket 與 STOMP](41-WebSocket與STOMP.md)），
> `brokerURL` 直接寫 `ws://…/ws`，正式環境是 `wss://…/ws`。

## 最小的例子

```js
import { Client } from '@stomp/stompjs';

const client = new Client({
  brokerURL: 'ws://localhost:8080/ws',
  connectHeaders: { 'X-Session-Token': localStorage.getItem('sessionToken') },
  reconnectDelay: 3000,                      // 斷線 3 秒後自動重連
});

client.onConnect = () => {
  client.subscribe('/topic/session/1052', (msg) => {
    const event = JSON.parse(msg.body);
    console.log(event.type, event.payload);
  });
};

client.activate();
```

**核心就這幾行。** 剩下的是怎麼跟 React 整合。

## 包成一個 Hook（我們的做法）

```jsx
// src/hooks/useStomp.js
import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';

// 顧客手機帶用餐權杖；KDS、櫃檯帶員工 JWT（後端攔截器兩種都認）
function wsAuthHeaders() {
  const sessionToken = localStorage.getItem('sessionToken');
  if (sessionToken) return { 'X-Session-Token': sessionToken };
  const jwt = localStorage.getItem('jwt');
  return jwt ? { Authorization: `Bearer ${jwt}` } : {};
}

export function useStomp({ topics, onEvent, onReconnect, enabled = true }) {
  const clientRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const client = new Client({
      brokerURL: import.meta.env.VITE_WS_URL,
      connectHeaders: wsAuthHeaders(),
      reconnectDelay: 3000,
      onConnect: () => {
        topics.forEach(topic => {
          client.subscribe(topic, (msg) => onEvent(JSON.parse(msg.body)));
        });
        onReconnect?.();          // ★ 每次（重新）連上都重抓完整資料
      },
      onStompError: (frame) => console.error('STOMP 錯誤', frame.headers['message']),
    });

    client.activate();
    clientRef.current = client;

    return () => { client.deactivate(); };     // ★ 離開頁面就斷線
  }, [enabled, topics.join(','), onEvent, onReconnect]);

  return clientRef;
}
```

用起來：

```jsx
// 這桌收場了（SESSION_CLOSED）：兩種 reason，兩種畫面
function handleSessionClosed(payload, { navigate, setClosed }) {
  localStorage.removeItem('sessionToken');
  if (payload.reason === 'CANCELLED') {
    navigate('/', { replace: true });   // 店長取消這次用餐：不顯示任何面板，直接回 C-00
  } else {
    setClosed(true);                    // reason === 'PAID'：顯示「已結帳」面板
  }
}

function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [closed, setClosed] = useState(false);        // 結帳完成後變 true
  const { sessionId } = useContext(SessionContext);
  const navigate = useNavigate();

  const refetch = useCallback(async () => {
    const data = await request('/dining-sessions/me/orders');   // { sessionStatus, subtotal, tickets }
    setTickets(data.tickets);
  }, []);

  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'NEW_TICKET':
        setTickets(prev => [...prev, event.payload]);
        break;
      case 'ITEM_SERVED':
        setTickets(prev => prev.map(t => applyServed(t, event.payload)));
        break;
      case 'TICKET_CANCELLED':
        setTickets(prev => prev.filter(t => t.ticketId !== event.payload.ticketId));
        break;
      case 'SESSION_CLOSED':          // payload：{ sessionId, reason: 'PAID' | 'CANCELLED' }
        handleSessionClosed(event.payload, { navigate, setClosed });
        break;
      case 'CART_UPDATED':            // 購物車的事，訂單頁不用管（菜單頁、購物車頁才處理）
        break;
      default:
        refetch();          // 不認識的事件就整包重抓，最安全
    }
  }, [refetch, navigate]);

  useStomp({
    topics: [`/topic/session/${sessionId}`, '/topic/menu'],
    onEvent: handleEvent,
    onReconnect: refetch,           // ★ 關鍵
  });

  useEffect(() => { refetch(); }, [refetch]);   // 第一次進頁面先抓一次

  if (closed) return <SessionClosed />;          // 「這桌已經結帳完成」＋回到首頁
  return <TicketList tickets={tickets} />;
}
```

## 同桌共用購物車：CART_UPDATED

購物車存在後端、整桌共用。同桌任何人加、改、刪，後端都會推一個 `CART_UPDATED` 到 `/topic/session/{id}`：

```json
{
  "type": "CART_UPDATED",
  "payload": {
    "version": 7,
    "cart": { "items": [ ... ], "totalQuantity": 3, "subtotal": 1210.00 },
    "change": { "action": "ADDED", "byGuest": "陳小美", "byGuestId": 7,
                "itemName": "安格斯霜降牛五花", "quantity": 1, "optionSummary": "全份" }
  }
}
```

payload 分三塊：

| 欄位 | 是什麼 | 拿來幹嘛 |
|---|---|---|
| `version` | 購物車的版本號，每次異動 +1 | 擋掉亂序或過期的推播 |
| `cart` | **整份購物車**，內容跟 `GET /api/dining-sessions/me/cart` 一模一樣 | 直接畫，不用再打 API |
| `change` | 這次變的是哪一項、誰做的 | 給 C-04b 通知條用 |

### 為什麼要有 `version`

收到推播就直接套用的話，有兩個情況會出錯：

1. **亂序**——同桌兩支手機幾乎同時操作，兩則推播到你手機的順序，不一定等於後端實際處理的順序。後到的如果是舊的，畫面就停在錯的狀態。
2. **重抓的回應晚到**——你重抓了一次，HTTP 回應還在路上，這時一則更新的推播先到了；然後那個舊的 HTTP 回應才回來，把新的蓋掉。

解法是記住「最後套用過的版本」，**只有比它大才套用**：

```js
let localVersion = 0;

function applyCart(version, cart) {
  if (version <= localVersion) return;   // 舊的，整包丟掉
  localVersion = version;
  setCart(cart);
}
```

**推播和重抓都走這個函式**，所以它們不會互相覆蓋——`GET /me/cart` 的回傳也帶 `version`。

還有第三個好處：**漏收一則也會自己好**。因為每則推播帶的是整份，不是「變化量」，
所以漏掉一則之後，下一則就把你補回正確狀態了。

---

`change.action` 有 `ADDED`／`UPDATED`／`REMOVED` 三種。`change.byGuest` 是顯示名稱（給通知條用），`change.byGuestId` 是做這件事的那支手機在這桌的 guest id。
`optionSummary` 是選到的選項用「・」串起來（例：「全份・加蔥花」），沒有選項就是 `null`；通知條寫成「安格斯霜降牛五花 ×1・全份」。
送單事件 `NEW_TICKET` 推給同桌的那份也帶這兩個欄位；櫃檯在 S-03 代客加點不經過購物車，`byGuest` 是「櫃檯」、`byGuestId` 是 `null`；
預點轉單（開桌當下，還沒有手機加入）兩個都是 `null`，不跳通知。

**自己的動作不通知自己**：前端拿 `change.byGuestId` 跟這支手機掃碼加入時拿到的 `guest.id`（`POST /join` 的回應）比，相同就只更新畫面、不跳通知條。
不要比 `byGuest`——會員暱稱可能重複，兩個「小美」同桌就會互相吃掉通知。

菜單頁（C-04）這樣接：

```jsx
import { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { fetchCart } from '../services/api/cart';

function MenuPage() {
  const [cart, setCart] = useState({ items: [], totalQuantity: 0 });   // 整份購物車，跟 GET /me/cart 的回傳同形狀
  const [notice, setNotice] = useState(null);     // 同桌通知條（C-04b／C-04c）
  const [closed, setClosed] = useState(false);
  const { sessionId, guest } = useContext(SessionContext);   // guest：join 時拿到的 { id, displayName }
  const navigate = useNavigate();

  const versionRef = useRef(0);                   // 最後套用過的購物車版本

  const applyCart = useCallback((version, next) => {
    if (version <= versionRef.current) return;    // 舊的，整包丟掉
    versionRef.current = version;
    setCart(next);
  }, []);

  const reloadCart = useCallback(async () => {    // 只在連上／回前景／送出後用
    const c = await fetchCart();                  // 回傳含 version
    applyCart(c.version, c);
  }, [applyCart]);

  const flash = useCallback((text) => {           // 通知條顯示 3 秒
    setNotice(text);
    setTimeout(() => setNotice(null), 3000);
  }, []);

  const handleEvent = useCallback((event) => {
    const p = event.payload;
    switch (event.type) {
      case 'CART_UPDATED': {
        applyCart(p.version, p.cart);             // 推播直接帶整份，不用再打 API
        const c = p.change;
        if (c.action === 'ADDED' && c.byGuestId !== guest.id) {         // 自己加的不用通知自己
          const opt = c.optionSummary ? `・${c.optionSummary}` : '';     // 沒有選項就不接
          flash(`${c.byGuest} 加了 ${c.itemName} ×${c.quantity}${opt}`);  // C-04b：太長由 CSS 截斷加「…」
        }
        break;
      }
      case 'NEW_TICKET':                          // 有人把整桌購物車送出了
        reloadCart();                             // 送單不另推 CART_UPDATED，這裡要自己重抓（購物車被清空）
        if (p.byGuest && p.byGuestId !== guest.id) {   // 櫃檯代客加點：「櫃檯」／null → 會跳；預點轉單：null／null → 不跳
          flash(`${p.byGuest} 送出 ${p.quantity} 項`);                     // C-04c：N＝份數加總（白飯 ×2 算 2），不是 items.length
        }
        break;
      case 'SESSION_CLOSED':                      // PAID 時，沒送出的購物車已經在結清的交易裡捨棄了
        handleSessionClosed(p, { navigate, setClosed });
        break;
      default:
        reloadCart();                             // 售完、補貨等菜單事件這裡省略，至少把購物車對齊
    }
  }, [applyCart, reloadCart, flash, guest, navigate]);

  useStomp({
    topics: [`/topic/session/${sessionId}`, '/topic/menu'],
    onEvent: handleEvent,
    onReconnect: reloadCart,                      // ★ 重連一樣重抓
  });

  useEffect(() => { reloadCart(); }, [reloadCart]);
  useResyncOnForeground(reloadCart);              // ★ 回到前景要重抓，見下一節

  const cartCount = cart.totalQuantity;           // 角標＝份數加總，後端已經算好了（白飯 ×2 算 2）

  if (closed) return <SessionClosed />;          // 已結帳面板：底部購物車列跟著消失
  return (
    <>
      {notice && <NotifyBar text={notice} />}
      <MenuList />
      <CartBar count={cartCount} />
    </>
  );
}
```

五個重點：

1. **`CART_UPDATED` 帶整份購物車，直接套用，但要比 `version`。** 不要拿 `change` 去改本機陣列——那塊只描述「這次變了什麼」，是給通知條用的，拿它算購物車很快就會跟後端對不上。
2. **送出點餐推的是 `NEW_TICKET`，不是 `CART_UPDATED`。** 但送出會把整桌購物車清空，所以收到 `NEW_TICKET` 也要重抓購物車，不然別人手機上的角標會停在舊數字。
3. **兩個人同時按「送出整桌點餐」**：後端用列鎖讓兩筆排隊，先到的送出整份，後到的拿到 `409 CART_EMPTY`（「購物車是空的，可能同桌已經送出了」），前端提示後重抓就好（見 [fetch 串接後端 API](../frontend/40-fetch串接API.md)、[鎖與併發](../database/28-鎖與併發.md)）。
4. **數量一律算份數。** 角標、「送出 N 項」都是 `quantity` 加總；用 `items.length` 會把「白飯 ×2」算成 1 項，跟畫面上的份數對不上。
5. **自己做的不跳通知，比 `change.byGuestId` 不比名字。** 自己加的、自己送出的，照樣套用購物車、只是不跳通知條；櫃檯代客加點的 `byGuestId` 是 `null`，同桌每支手機都會跳「櫃檯 送出 3 項」。

`SESSION_CLOSED` 兩頁都用同一個 `handleSessionClosed`：`PAID` 顯示「已結帳」面板，`CANCELLED` 什麼都不顯示、清掉權杖直接回 `/`。

## 回到前景要重抓

推播只能補「連著的時候」發生的事。**沒連上的那段補不回來**，所以還有三個時機要主動重抓一次。

手機上這件事比你想的常發生：使用者切去看 LINE、鎖螢幕、回訊息再切回來——
背景時作業系統常常把 WebSocket 連線收掉，iOS Safari 特別積極。

```jsx
import { useEffect } from 'react';

export function useResyncOnForeground(resync) {
  useEffect(() => {
    let timer = null;
    const fire = () => {                     // 下面幾個事件常常同時觸發，合併成一次
      clearTimeout(timer);
      timer = setTimeout(resync, 200);
    };

    // ① 從背景回到前景
    const onVisible = () => {
      if (document.visibilityState === 'visible') fire();
    };
    document.addEventListener('visibilitychange', onVisible);

    // ② 從 bfcache 還原（按「上一頁」回來）。
    //    這種情況不會觸發 visibilitychange，要另外聽。iOS Safari 很常走這條。
    const onPageShow = (e) => { if (e.persisted) fire(); };
    window.addEventListener('pageshow', onPageShow);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [resync]);
}
```

第三個時機是 **WebSocket 重連**，已經在 `useStomp` 的 `onReconnect` 裡了（見上面的 `MenuPage`）。

> **為什麼要 `setTimeout` 合併？**
> 回到前景的瞬間，`visibilitychange` 會觸發、WebSocket 也會重連，
> 兩邊各打一次 API 就重複了。延遲 200 毫秒合併成一次就好。
>
> **為什麼重抓不會蓋掉新資料？**
> 因為 `reloadCart` 走的是 `applyCart`，會比對 `version`。
> 晚到的舊回應自動被丟掉，不用另外處理。

## 三件一定要做的事

**① `onConnect` 裡一定要 `refetch()`**

每次連上（包含斷線後重連）都重抓一次完整資料。斷線那幾秒漏掉的東西，就靠這個補回來。

**② `useEffect` 的 return 一定要 `deactivate()`**

不斷線的話，使用者換十次頁就有十條連線在跑。

**③ 回到前景要重抓**

見上一節。手機切背景的頻率比你想的高，漏了這個，使用者切回來看到的是舊畫面。

## 讓「即時」看得見

同步太快，demo 時評審反而看不出來。加一點視覺提示：

```jsx
// 新單進來時高亮 2 秒
const [highlightId, setHighlightId] = useState(null);

case 'NEW_TICKET':
  setTickets(prev => [...prev, event.payload]);
  setHighlightId(event.payload.ticketId);
  setTimeout(() => setHighlightId(null), 2000);
  break;
```

```jsx
<div className={ticket.ticketId === highlightId
  ? 'animate-pulse ring-2 ring-brand-500' : ''}>
```

**這個小動畫在 demo 時的效果比講十句話有用。**

## 連線狀態指示

```jsx
const [connected, setConnected] = useState(false);
// client 設定裡：
onConnect: () => { setConnected(true); ... }
onWebSocketClose: () => setConnected(false);
```

```jsx
{!connected && (
  <div className="bg-warn-bg text-warn text-sm px-4 py-2">
    連線中斷，正在重新連線…
  </div>
)}
```

使用者知道現在資料可能不是最新的，比默默失敗好。

## 15 分鐘動手小練習

接續 [WebSocket 與 STOMP](41-WebSocket與STOMP.md) 的後端練習：

1. 裝 `@stomp/stompjs`
2. 寫一個最小的 `useStomp`
3. 訂閱 `/topic/counter-test`
4. 開兩個分頁，一個按按鈕，另一個要跟著變
5. **把其中一個分頁的網路關掉幾秒再打開** → 看它自動重連
6. **把 `deactivate()` 註解掉**，反覆換頁十次 → F12 Network 的 WS 分頁會看到十條連線

第 5、6 步是本頁的重點。

## 你會遇到的坑

**① 忘記 `deactivate()`**
連線累積。

**② 沒有在重連後重抓**
斷線期間的更新永遠遺失，畫面跟資料庫對不起來。

**③ 在 `onConnect` 之前就 `subscribe` 或 `publish`**
會噴錯。所有操作都要在 `onConnect` 裡面。

**④ 依賴陣列放了每次都變的東西**
`topics: ['/topic/a']` 這個陣列每次渲染都是新的 → effect 一直重跑 → 連線一直斷開重連。
→ 用 `useMemo` 或把 `topics.join(',')` 放進依賴。

**⑤ 以為有 WebSocket 就不用初次抓資料**
WebSocket 只推「之後發生的事」。進頁面時的現有資料還是要用 API 抓。

**⑥ 正式環境網址寫死 `ws://`**
HTTPS 網站只能用 `wss://`。
→ 用環境變數。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `WebSocket connection failed` | 連不上 | 後端沒開、網址錯、CORS 沒設 |
| `Mixed Content: ... was loaded over HTTPS, but attempted to connect to ws://` | HTTPS 頁面用了不安全的 ws | 改成 `wss://` |
| 一直重連 | 接通時身分驗證失敗，或訂閱了沒權限的頻道 | 檢查 token 有沒有帶對、KDS／櫃檯有沒有帶員工 JWT |
| 畫面更新但資料不對 | 事件處理邏輯有問題 | 不認識的事件就整包 refetch |
| 換頁後還在收訊息 | 沒 deactivate | 檢查 useEffect 的 return |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 接電話的客戶端 | STOMP Client |
| 訂閱喇叭 | `subscribe` |
| 自動重撥 | `reconnectDelay` |
| 掛電話 | `deactivate()` |
| 安全的 WebSocket | `wss://` |

## 自我檢核

1. 為什麼 `onConnect` 裡要呼叫 `refetch()`？
2. 不寫 `deactivate()` 會發生什麼？
3. 有了 WebSocket，進頁面時還需要用 API 抓一次資料嗎？
4. HTTPS 的網站要用 `ws://` 還是 `wss://`？
5. `CART_UPDATED` 帶了整份購物車，為什麼還要比 `version` 才能套用？
6. `SESSION_CLOSED` 的 `reason` 是 `PAID` 和 `CANCELLED` 時，畫面各該怎麼做？
7. 判斷「這是不是我自己加的」，為什麼要比 `byGuestId`，不比 `byGuest`？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [@stomp/stompjs 官方文件](https://stomp-js.github.io/) | 英文 | 中階 | 25 分 |
| [淺談 WebSocket 協定（含前端實作）](https://hackmd.io/@Heidi-Liu/javascript-websocket) | 繁中 | 入門 | 30 分 |

## 相關頁面

[WebSocket 與 STOMP](41-WebSocket與STOMP.md)　[useEffect](../frontend/37-useEffect.md)　[fetch 串接後端 API](../frontend/40-fetch串接API.md)
