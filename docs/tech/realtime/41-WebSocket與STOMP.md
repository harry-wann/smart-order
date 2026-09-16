# WebSocket 與 STOMP

**難度** ★★★☆☆　**用在哪些模組** M2、M3、M4、M5、M6　**哪幾週** 第 2～3 週

## 一句話

一般的網路請求是**寫信**，WebSocket 是**講電話**。

## 想像一下

你在等一個包裹。

**寫信的做法**：你每三分鐘跑到門口問管理員「我的包裹到了嗎？」他說「還沒」。你回房間。三分鐘後再問一次。一整天跑了兩百趟，其中一百九十九趟是白跑的。

**講電話的做法**：你跟管理員說「到了打給我」，然後回房間做自己的事。包裹到的那一秒，電話響了。

網頁平常用的 [HTTP](../web/07-HTTP請求與回應.md) 就是寫信：前端問一次，後端答一次，關係結束。**後端沒辦法主動來找前端。**

WebSocket 就是講電話：連線接通後一直掛著，兩邊誰想說話都可以直接說。

## 在我們的火鍋店裡

你和朋友坐 A03 桌，各自拿手機點餐。購物車是整桌共用的：你把一盤牛五花加進購物車，朋友的手機要馬上看到。

- 沒有 WebSocket：朋友的手機每 3 秒問一次「有新的嗎」，多數時候答案是「沒有」
- 有 WebSocket：你一送出，伺服器直接推到朋友手機上

廚房看板一樣。客人一送單，廚房螢幕立刻跳出來。

## 它怎麼運作

**第一步：接通電話（握手）**
瀏覽器跟伺服器說「我想從寫信改成講電話」，伺服器同意，線就接上了。

**第二步：訂閱頻道**
想像餐廳裡裝了好幾個廣播喇叭：

| 喇叭 | 誰聽得到 | 喊什麼 |
|---|---|---|
| A03 桌的喇叭 | 只有坐 A03 的手機 | 陳小美加了牛五花、新的一單、牛五花出餐了、這桌結帳了 |
| 廚房的喇叭 | 廚房螢幕 | B02 桌來了新單 |
| 櫃檯的喇叭 | 櫃檯 | A03 按服務鈴了、桌況變了 |
| 菜單的喇叭 | 所有正在點餐的手機 | 牛五花賣完了 |
| 候位的喇叭 | 櫃檯與候位螢幕 | 叫號 A012 |

每支手機接通後說「我要聽 A03 桌的喇叭」，這叫**訂閱**。

**第三步：廣播**
後端對某個喇叭喊一聲，所有訂閱那個喇叭的人同時收到。

## STOMP 是什麼

WebSocket 本身只保證「兩邊能互傳文字」，**它不知道什麼是「頻道」**。

STOMP 就是加在上面的一套規矩，定義了「怎麼訂閱」「怎麼發送」。有了它，Spring 才能提供 `/topic/xxx` 這種好用的頻道機制。

**類比**：WebSocket 是電話線，STOMP 是講電話的禮節（先說「喂」、報上名字、講完說再見）。

## 後端怎麼寫

**設定（A 寫一次）**

```java
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor authInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")                // 原生 WebSocket：前端 brokerURL 直接連 ws://…/ws
                .setAllowedOriginPatterns("http://localhost:*", "https://*.vercel.app");
        // 不加 .withSockJS()：加了之後原生 WebSocket 要改連 /ws/websocket，直接連 /ws 會握手失敗
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");  // 內建的簡易總機
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authInterceptor);       // 下面那個攔截器要在這裡掛上去才會生效
    }
}
```

> HTTP 握手（升級請求）本身不帶我們的權杖，所以 [Spring Security](../backend/20-SpringSecurity.md) 要放行 `/ws/**`；
> 真正的身分檢查在下面的攔截器。

**接通時驗證身分、訂閱時檢查頻道（很重要，不要漏）**

顧客手機在 CONNECT frame 帶 `X-Session-Token`，KDS 與櫃檯帶 `Authorization: Bearer <員工 JWT>`，兩種都要認：

```java
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final DiningSessionService sessionService;
    private final JwtService jwtService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
            MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        StompCommand command = accessor.getCommand();

        // ① 接通時：兩種身分擇一驗
        if (StompCommand.CONNECT.equals(command)) {
            String sessionToken = accessor.getFirstNativeHeader("X-Session-Token");
            String bearer = accessor.getFirstNativeHeader("Authorization");
            if (sessionToken != null) {                                   // 顧客手機
                var session = sessionService.validate(sessionToken);       // 驗不過就丟例外
                accessor.setUser(new WsUser("session-" + session.getId(), session.getId(), null));
            } else if (bearer != null && bearer.startsWith("Bearer ")) {  // 員工（KDS、櫃檯）
                var staff = jwtService.parseStaff(bearer.substring(7));    // 驗不過就丟例外
                accessor.setUser(new WsUser("staff-" + staff.id(), null, staff.role()));
            } else {
                throw new AccessDeniedException("沒有帶身分");
            }
        }

        // ② 訂閱時：這個身分能不能聽這個喇叭（對照 04 §3.2 的頻道表）
        if (StompCommand.SUBSCRIBE.equals(command)) {
            if (!(accessor.getUser() instanceof WsUser user)
                    || !canSubscribe(user, accessor.getDestination())) {
                throw new AccessDeniedException("不能訂閱 " + accessor.getDestination());
            }
        }
        return message;
    }

    private boolean canSubscribe(WsUser u, String dest) {
        if (dest.startsWith("/topic/session/")) {                 // 只能聽自己那一桌
            return u.sessionId() != null && dest.equals("/topic/session/" + u.sessionId());
        }
        return switch (dest) {
            case "/topic/menu"                       -> true;     // 任何有效身分
            case "/topic/kitchen"                    -> u.hasRole("KITCHEN", "MANAGER");
            case "/topic/counter", "/topic/waitlist" -> u.hasRole("COUNTER", "MANAGER");
            default                                  -> false;
        };
    }
}

// 放進 setUser 的身分：顧客有 sessionId，員工有 role
record WsUser(String name, Long sessionId, String role) implements Principal {
    public String getName() { return name; }
    boolean hasRole(String... roles) { return role != null && List.of(roles).contains(role); }
}
```

**不做這個的話，隔壁桌的人可以訂閱你這桌的頻道，看到你點了什麼。**

**廣播（在 Service 裡）**

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final SimpMessagingTemplate messaging;

    @Transactional
    public OrderTicketDto submitOrder(...) {
        // ... 扣庫存、建立訂單（資料庫操作）...
        OrderTicketDto dto = toDto(ticket);

        // 推播放在交易外面比較安全，這裡示意
        messaging.convertAndSend("/topic/session/" + sessionId,
            new WsEvent("NEW_TICKET", dto));
        messaging.convertAndSend("/topic/kitchen",
            new WsEvent("NEW_TICKET", toKitchenDto(ticket)));

        return dto;
    }
}
```

## 統一的事件格式

```json
{
  "type": "NEW_TICKET",
  "payload": { ... },
  "serverTime": "2026-09-13T18:42:11+08:00"
}
```

我們的事件類型（常用的幾個，完整清單見 [04-API 規格](../../spec/04-API規格.md) §3.4）：

| type | 頻道 | 意思 |
|---|---|---|
| `CART_UPDATED` | session | 整桌購物車有人加、改、刪（帶 `action`、`byGuest`、`byGuestId`、`itemName`、`quantity`、`optionSummary`；`optionSummary` 例如「全份・加蔥花」，沒有選項是 `null`），同桌手機重抓購物車；`byGuestId` 是自己的就不跳通知 |
| `NEW_TICKET` | session、kitchen | 有新的點餐單（`quantity` 是這張單的份數加總，「送出 N 項」用它；推給同桌的那份多帶 `byGuest`、`byGuestId`：誰按了送出；櫃檯代客加點是「櫃檯」／`null`） |
| `ITEM_SERVED` | session、kitchen | 某個品項出餐了 |
| `TICKET_CANCELLED` | session、kitchen | 整單取消 |
| `SESSION_UPDATED` | session、counter | 金額或狀態變了 |
| `SESSION_CLOSED` | session、counter | 這桌收場了，帶 `reason`：`PAID`（結清，沒送出的購物車一起捨棄）→ 同桌手機切到「已結帳」；`CANCELLED`（店長取消用餐）→ 直接回首頁。兩種都清掉權杖 |
| `MENU_SOLD_OUT` | menu | 某品項售完 |
| `MENU_RESTOCKED` | menu | 補貨了 |
| `SERVICE_CALL` | counter | 有人按服務鈴 |
| `TABLE_STATUS` | counter | 桌況變了（開桌、清潔完成、櫃檯代客取消訂位…） |
| `WAITLIST_CALLED` | waitlist | 叫號 |

## 最重要的一件事

> **斷線重連之後，一定要重新抓一次完整資料。**

手機切到別的 App、進電梯、Wi-Fi 換 4G——連線就斷了。**斷線期間推的東西你全部收不到。**

**WebSocket 保證「快」，不保證「不漏」。**

做了「重連後重抓」這件事，你順便就拿到了容錯：就算 WebSocket 完全掛掉，只要使用者重新整理，資料還是對的。

## 15 分鐘動手小練習

做一個「兩個分頁即時同步的計數器」：

1. 後端加上上面的 `WebSocketConfig`
2. 加一支 API：`POST /api/test/increment`，收到後 `messaging.convertAndSend("/topic/counter-test", newValue)`
3. 前端連上、訂閱 `/topic/counter-test`，收到就 setState
4. **開兩個瀏覽器分頁**，在其中一個按按鈕
5. 另一個分頁的數字要立刻跟著動

**做到這個，你就會 WebSocket 了。** 剩下的都是同一招換場景。

## 你會遇到的坑

**① 電話會斷**
→ 重連後重抓完整資料。

**② 誰都能偷聽**
→ 接通時驗證身分、訂閱時檢查頻道（`ChannelInterceptor`）。只驗 CONNECT 不管 SUBSCRIBE，拿到任何一桌權杖的人還是能訂閱別桌。

**③ 部署後連不上**
WebSocket 需要伺服器支援協定升級，有些平台不給。
→ **第 5 週部署時就要測**。Render／Railway 可以。

**④ 在交易裡面推播**
交易還沒 commit 就推出去，前端收到後去查卻查不到資料。
→ 推播放在交易提交之後（或用 `TransactionSynchronization`）。

**⑤ 多台伺服器時 SimpleBroker 不夠**
兩台伺服器各自的內建總機互相看不到。
→ 要換成外部 broker（[RabbitMQ](../advanced/45-訊息佇列RabbitMQ.md) 或 [Redis](44-Redis.md)）。單台部署不用管。

**⑥ 推太多東西**
每次有人動一下就推全部資料。推**事件**就好，前端自己合併。

**⑦ 握手就被擋（401），根本走不到攔截器**
Spring Security 的 `anyRequest().authenticated()` 在 HTTP 握手階段就擋掉了。
→ `/ws/**` 要 `permitAll()`（見 [Spring Security](../backend/20-SpringSecurity.md)），身分交給 CONNECT frame 驗。

**⑧ 後端加了 `.withSockJS()`，前端原生 WebSocket 連 `/ws` 失敗**
SockJS 端點給原生 WebSocket 用的路徑是 `/ws/websocket`。
→ 我們不用 SockJS：後端只註冊原生的 `/ws`，前端 `brokerURL` 直接連它。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `WebSocket connection to 'ws://...' failed` | 電話打不通 | 後端沒開、網址錯、或 allowedOrigins 沒設 |
| 瀏覽器直接開 `/ws` 看到 Whitelabel Error | 正常 | WebSocket 不能用網址列開 |
| `Lost connection to server` | 斷線 | 正常現象，做自動重連 |
| `Cannot read properties of null` 在 client 上 | 還沒接通就發送 | 要在 `onConnect` 之後 |
| 部署後一直連不上 | 平台不支援 upgrade | 換平台或改用輪詢 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 講電話 | WebSocket |
| 講電話的禮節 | STOMP 協定 |
| 喇叭、頻道 | topic / destination |
| 訂閱喇叭 | subscribe |
| 對喇叭喊話 | publish / `convertAndSend` |
| 接電話的總機 | message broker |
| 打不通改用寫信（我們沒用） | SockJS fallback |
| 接通時檢查身分 | `ChannelInterceptor` |

## 自我檢核

1. 為什麼 HTTP 做不到「伺服器主動通知」？
2. 為什麼要分成 A03 桌、廚房、櫃檯不同的頻道？
3. 斷線重連之後為什麼一定要重抓完整資料？
4. 我們的系統裡有哪幾個頻道？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [淺談 WebSocket 協定：實作一個簡單的即時聊天室吧！](https://hackmd.io/@Heidi-Liu/javascript-websocket) | **繁中** | **入門** | 30 分 |
| [MDN：製作 WebSocket 客戶端應用程式](https://developer.mozilla.org/zh-TW/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications) | 繁中 | 入門 | 20 分 |
| [Spring 官方 Guide：Using WebSocket to build an interactive web application](https://spring.io/guides/gs/messaging-stomp-websocket) | 英文 | 中階 | 60 分 |
| [Springboot 整合 WebSocket，使用 STOMP 協議](https://developer.aliyun.com/article/953288) | 簡中 | 中階 | 40 分 |

**建議順序**：先看繁中那篇搞懂概念 → 跟著 Spring 官方 Guide 做一次 → 回來做 15 分鐘小練習。

## 相關頁面

[前端接 WebSocket](42-前端接WebSocket.md)　[HTTP 請求與回應](../web/07-HTTP請求與回應.md)　[CORS 跨來源問題](../web/11-CORS跨來源.md)　[Redis](44-Redis.md)
