# 前端接 WebSocket

**難度** ★★★☆☆　**用在哪些模組** M2、M3、M4、M5　**哪幾週** 第 3 週

## 一句話

用 `@stomp/stompjs` 接上後端的喇叭，收到訊息就更新畫面。

## 要裝什麼

```bash
npm install @stomp/stompjs sockjs-client
```

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

export function useStomp({ topics, onEvent, onReconnect, enabled = true }) {
  const clientRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const client = new Client({
      brokerURL: import.meta.env.VITE_WS_URL,
      connectHeaders: {
        'X-Session-Token': localStorage.getItem('sessionToken') ?? '',
      },
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
function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const { sessionId } = useContext(SessionContext);

  const refetch = useCallback(async () => {
    setTickets(await request('/dining-sessions/me/orders'));
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
      default:
        refetch();          // 不認識的事件就整包重抓，最安全
    }
  }, [refetch]);

  useStomp({
    topics: [`/topic/session/${sessionId}`, '/topic/menu'],
    onEvent: handleEvent,
    onReconnect: refetch,           // ★ 關鍵
  });

  useEffect(() => { refetch(); }, [refetch]);   // 第一次進頁面先抓一次

  return <TicketList tickets={tickets} />;
}
```

## 兩件一定要做的事

**① `onConnect` 裡一定要 `refetch()`**

每次連上（包含斷線後重連）都重抓一次完整資料。斷線那幾秒漏掉的東西，就靠這個補回來。

**② `useEffect` 的 return 一定要 `deactivate()`**

不斷線的話，使用者換十次頁就有十條連線在跑。

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
| 一直重連 | 握手驗證失敗 | 檢查 token 有沒有帶對 |
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

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [@stomp/stompjs 官方文件](https://stomp-js.github.io/) | 英文 | 中階 | 25 分 |
| [淺談 WebSocket 協定（含前端實作）](https://hackmd.io/@Heidi-Liu/javascript-websocket) | 繁中 | 入門 | 30 分 |

## 相關頁面

[WebSocket 與 STOMP](41-WebSocket與STOMP.md)　[useEffect](../frontend/37-useEffect.md)　[fetch 串接後端 API](../frontend/40-fetch串接API.md)
