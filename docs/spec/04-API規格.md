# 04 API 規格

> 本文件是前後端的**合約**。實作後以 Swagger UI（`/swagger-ui.html`）為單一真實來源；本文件描述設計原則與端點總表。
> 不熟悉 REST 的人先看 [REST API 設計](../tech/web/10-REST-API設計.md) 和 [HTTP 狀態碼](../tech/web/08-HTTP狀態碼.md)。

## 1. 通用約定

| 項目 | 值 |
|---|---|
| Base URL | `/api` |
| 格式 | `application/json; charset=utf-8` |
| 時間 | ISO 8601，例 `2026-09-13T18:30:00+08:00` |
| 金額 | 數字，兩位小數 |
| JSON 命名 | `camelCase` |
| 網址命名 | 小寫 + 連字號（`/dining-sessions`） |

### 1.1 成功回應

**直接回傳資料本身**，不包一層 `{success, data}`。分頁用 Spring Data `Page` 的預設結構。

### 1.2 錯誤回應（統一格式）

由 [`@RestControllerAdvice`](../tech/backend/18-全域例外處理.md) 全域處理，**所有錯誤都長這樣**：

```json
{
  "timestamp": "2026-09-13T18:30:00+08:00",
  "status": 409,
  "code": "ITEM_SOLD_OUT",
  "message": "部分品項已售完，請調整後重新送出",
  "path": "/api/dining-sessions/me/orders",
  "details": [
    { "field": "menuItemId", "message": "美國牛五花 庫存不足（剩 1）", "value": 12 }
  ]
}
```

> 兩個例外會多帶欄位：`409 BILL_CHANGED` 多帶一個 `bill`（最新帳單），前端直接重畫，不用再多打一支 API；
> `409 SESSION_CLOSED` 多帶一個 `reason`（`PAID`／`CANCELLED`，跟 WebSocket 的 `SESSION_CLOSED` 同一個值），前端才知道要顯示「已結帳」面板還是直接回首頁。

```json
{
  "timestamp": "2026-09-13T19:02:40+08:00",
  "status": 409,
  "code": "SESSION_CLOSED",
  "message": "這桌已經結帳，不能再加點",
  "path": "/api/dining-sessions/me/cart/items",
  "reason": "PAID"
}
```

### 1.3 錯誤碼表

| HTTP | code | 何時發生 | 前端該做什麼 |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | 欄位驗證失敗 | 在欄位下顯示 `details` 訊息 |
| 400 | `SOUP_BASE_REQUIRED` | 送出點餐時本桌還沒有鍋底，這次購物車裡也沒有 | 提示「這桌還沒點鍋底，共鍋至少要一份」，切到 C-04 的鍋底頁籤 |
| 400 | `OPTION_REQUIRED` | 必選群組沒選 | 標出是哪個群組 |
| 401 | `UNAUTHORIZED` | 未登入或 JWT 失效 | 導回登入頁 |
| 401 | `INVALID_SESSION_TOKEN` | 用餐權杖失效（已結帳或取消） | 清掉用餐權杖，導到 C-00 首頁（`/`）；客人再掃桌上 QR 時 C-01 依桌位狀態顯示 |
| 403 | `FORBIDDEN` | 角色權限不足 | 顯示「權限不足」 |
| 404 | `NOT_FOUND` | 資源不存在 | 顯示查無資料 |
| 404 | `MEMBER_NOT_FOUND` | 櫃檯用手機查會員，查無此人（進階 8.10） | S-03 會員欄下顯示「查無此會員」 |
| 409 | `ITEM_SOLD_OUT` | 送出點餐時品項已售完（加入購物車時已標售完也回這個） | **標紅該品項，整張單未成立** |
| 409 | `TABLE_NOT_OPENED` | 掃碼時該桌尚未開桌 | 顯示「請洽櫃檯帶位」 |
| 409 | `TABLE_OCCUPIED` | 開桌時該桌已在使用 | 顯示「此桌使用中」 |
| 409 | `TABLE_RESERVED` | 開桌時目標桌正在預約保留中（現場開桌、候位入座，或保留給**別筆**訂位的桌） | 顯示「這張桌保留給 陳怡君 18:30，客人來電取消的話請到預約管理取消訂位」，開桌按鈕停用 |
| 409 | `SESSION_CLOSED` | 這桌已經結帳或取消（送出點餐、改購物車、結清、付款、取消用餐時發現不是 `OPEN`）；回應多帶 `reason` | `reason = PAID`：顯示「這桌已經結帳，不能再加點」，C-04 顯示「已結帳」面板並清掉權杖，按「回到首頁」到 C-00；`reason = CANCELLED`：不顯示面板，清掉權杖直接回 C-00 |
| 409 | `SESSION_HAS_ORDERS` | 取消該次用餐時，這桌已經送出過點餐單 | 顯示「已經有點餐紀錄，請改用結帳」 |
| 409 | `CART_EMPTY` | 送出整桌點餐時購物車是空的（例如同桌另一人剛送出——是狀態衝突，不是欄位錯誤，所以用 409） | 顯示「購物車是空的，可能同桌已經送出了」，重抓購物車與本桌訂單 |
| 409 | `BILL_CHANGED` | 結清或付款時，重算的合計跟 `expectedTotal` 不同（剛好有人加點） | 顯示「金額有變動，請重新確認」，用回應裡的 `bill` 重畫再按一次；C-10 回 C-09 提示「剛剛有人加點，金額更新了，請再確認一次」 |
| 409 | `SLOT_UNAVAILABLE` | 訂位時段已客滿 | 重新載入可訂時段 |
| 409 | `PREORDER_LOCKED` | 已過預點修改期限（前一天 20:00） | 停用編輯，顯示請來電 |
| 409 | `CANCEL_DEADLINE_PASSED` | 客人線上取消時，已經進入訂位時間前 30 分鐘（見 4.11d） | 顯示「訂位前 30 分鐘內請來電取消」，停用取消鈕 |
| 409 | `RESERVATION_NOT_ACTIVE` | 報到開桌時，這筆訂位已經不是 `CONFIRMED`（剛被取消或已報到） | 顯示「這筆訂位已經取消或已報到」，重抓訂位清單 |
| 409 | `RESERVATION_NOT_CANCELLABLE` | 取消訂位時（客人線上或櫃檯代客），這筆已經不是 `CONFIRMED`（已報到、已取消、逾時未到；例如兩個櫃檯同時按） | 顯示「這筆訂位已經不能取消了」，重抓訂位清單 |
| 409 | `RESERVATION_EXPIRED` | 報到時已超過訂位時間 10 分鐘（保留時間已過） | 顯示「已超過保留時間，請改登記候位」 |
| 409 | `RESERVATION_TOO_EARLY` | 報到時還沒到訂位時間前 30 分鐘 | 顯示「還沒到可報到時間（18:00 起）」 |
| 409 | `ALREADY_ATTACHED` | 此次用餐已綁定會員（進階 8.10） | — |
| 422 | `PAYMENT_FAILED` | 模擬付款失敗（5%，進階 A5） | 顯示原因 + 重試按鈕 |
| 429 | `TOO_MANY_ATTEMPTS` | 驗證碼太頻繁 | 顯示倒數 |
| 500 | `INTERNAL_ERROR` | 未預期錯誤 | 通用錯誤訊息，**去看後端日誌** |

### 1.4 認證

| 身分 | 標頭 | 取得方式 | 有效期 |
|---|---|---|---|
| 匿名顧客 | `X-Session-Token: <token>` | 掃碼加入時取得 | 到該次結帳為止 |
| 匿名訂位 | `X-Reservation-Token: <token>` | 建立訂位時取得 | 到該筆訂位結束為止 |
| 同桌裝置 | `X-Device-Id: <uuid>` | 前端第一次開啟時自己產生，存 localStorage | 不過期；**只用來標示「誰加的」，不是身分驗證** |
| 會員 | `Authorization: Bearer <JWT>` | 手機驗證碼登入 | 7 天 |
| 員工 | `Authorization: Bearer <JWT>` | 帳密登入 | 12 小時 |

顧客端可**同時帶兩個**：用餐權杖說「我坐在哪一桌」，JWT 說「我是誰」。

**權限規則**：`/api/admin/**` 一律需要員工 JWT + 角色檢查（員工登入 `/api/admin/auth/login` 除外）。**前端隱藏按鈕不算權限控制**，後端一定要擋（見 [Spring Security](../tech/backend/20-SpringSecurity.md)）。

---

## 2. 端點總表

### 2.1 顧客端 — 用餐與點餐

| 方法 | 路徑 | 說明 | 認證 |
|---|---|---|---|
| GET | `/api/tables/{tableNo}/status` | 查桌位狀態（決定掃碼後顯示什麼） | 無 |
| POST | `/api/dining-sessions/join` | 掃碼加入用餐，取得權杖與同桌身分 `guest` | 無 |
| GET | `/api/dining-sessions/me` | 目前用餐資訊 | Session |
| GET | `/api/dining-sessions/me/cart` | **整桌共用購物車**（每列含 `addedBy`） | Session |
| POST | `/api/dining-sessions/me/cart/items` | 加入購物車（body：`menuItemId`、`quantity`、`optionValueIds`、`note`） | Session |
| PATCH | `/api/dining-sessions/me/cart/items/{id}` | 改數量／備註（同桌任何人都能改） | Session |
| DELETE | `/api/dining-sessions/me/cart/items/{id}` | 從購物車刪除（同桌任何人都能刪） | Session |
| GET | `/api/menu/categories` | 分類清單 | 無（公開讀取） |
| GET | `/api/menu/items` | 品項清單（`?categoryId=`） | 無（公開讀取） |
| GET | `/api/menu/items/{id}` | 品項詳情（含選項群組） | 無（公開讀取） |
| GET | `/api/menu/recommendations` | 推薦（`?type=POPULAR\|HISTORY\|PROFILE&audience=ADULT\|CHILD`），**進階**：`POPULAR` 是 A7 人氣推薦，`HISTORY`／`PROFILE` 是 8.E3／8.E4 | `POPULAR` 無；`HISTORY`／`PROFILE` 要會員 JWT |
| POST | `/api/dining-sessions/me/orders` | **送出整桌購物車 → 建立一張點餐單**（不帶品項） | Session |
| GET | `/api/dining-sessions/me/orders` | 本桌所有點餐單 | Session |
| DELETE | `/api/dining-sessions/me/order-items/{id}` | 取消單品 | Session |
| POST | `/api/service-calls` | **按服務鈴**（三種，沒有結帳） | Session |
| GET | `/api/dining-sessions/me/bill` | 帳單明細（C-09，**進階 A5**） | Session |
| POST | `/api/payments` | 模擬付款（C-10，**進階 A5**） | Session |
| POST | `/api/dining-sessions/me/attach-member` | 這次消費記到會員（消費紀錄、集點用，**進階 8.10**） | Session + JWT |

> **Session 認證的請求都要一起帶 `X-Device-Id`**（見 1.4），後端才知道購物車的每一列是誰加的、點餐單是誰送的。
> 購物車的增刪改與送出點餐，session 不是 `OPEN` 都回 `409 SESSION_CLOSED`。
>
> **沒有「要求結帳」與「取消結帳」這兩支。** 基礎是客人到櫃檯結帳（見 2.4 的 `settle`）；
> 查帳單不會改任何狀態，防呆改成結清／付款時的金額比對（見 4.8）。
>
> **菜單讀取不需要認證。** 菜單本來就不是機密，而且進階 A2 預先點餐的客人還沒到店、手上沒有用餐權杖，也要能看菜單。
> 推薦的 `HISTORY`／`PROFILE` 要知道你是誰，仍然要帶會員 JWT，沒帶就回 `401 UNAUTHORIZED`。

### 2.2 顧客端 — 會員

| 方法 | 路徑 | 說明 |
|---|---|---|
| POST | `/api/auth/otp/request` | 取得驗證碼（測試模式直接回傳） |
| POST | `/api/auth/otp/verify` | 驗證 → 回 JWT 或「需補資料」 |
| POST | `/api/members` | 補齊資料完成註冊 |
| GET / PATCH | `/api/members/me` | 我的資料 |
| GET | `/api/members/me/sessions` | 消費歷史（分頁，**進階 A1**） |
| GET | `/api/members/me/sessions/{id}` | 單次消費明細（**進階 A1**） |
| GET | `/api/members/me/points` | 點數餘額與異動紀錄（C-20，**進階 A6**） |
| GET | `/api/members/me/coupons` | 我的優惠券：可使用／已使用／已過期（C-20，**進階 A6**） |

### 2.3 顧客端 — 訂位

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/reservations/availability` | `?date=&partySize=` → 各時間點剩幾桌 |
| POST | `/api/reservations` | **建立訂位（含配桌），送出即成立** |
| GET | `/api/reservations/{id}` | 訂位詳情（含預點內容） |
| DELETE | `/api/reservations/{id}` | 客人線上取消（**訂位時間前 30 分鐘前**才可以，之後回 `409 CANCEL_DEADLINE_PASSED`；見 4.11d） |
| GET | `/api/members/me/reservations` | 我的訂位 |
| GET | `/api/reservations/{id}/preorder` | 目前的預點內容（進階） |
| PUT | `/api/reservations/{id}/preorder` | **整批覆蓋**預點內容，新增與調整共用（進階） |
| DELETE | `/api/reservations/{id}/preorder` | 清空預點（進階） |

> **預點用 `PUT` 整批覆蓋，不做部分更新。** C-17 的購物車只存在那支手機（預點時還沒有用餐紀錄，**不走** 2.1 那套整桌共用的後端購物車），把整份送上來最直覺；
> 後端 `deleteByReservationId` 再重建，不用寫 diff；重送同一份結果一樣（冪等）。
> 「先點餐」和「調整餐點」是同一支 API、同一個畫面（C-17）。
>
> **存取控制**：會員帶 JWT，匿名帶 `X-Reservation-Token`。
> 兩者都沒有就回 `401`——只憑 `{id}` 不可以動別人的訂位。

### 2.4 店家端 `/api/admin`

| 方法 | 路徑 | 說明 | 角色 |
|---|---|---|---|
| POST | `/api/admin/auth/login` | 員工登入 | — |
| GET | `/api/admin/tables` | 桌況總覽（每張桌多回 `displayStatus` 與 `heldFor`，見 4.3e） | 全部 |
| GET | `/api/admin/tables/{id}/open-options` | **開桌頁要的兩份清單**：可報到的候位與預約 | COUNTER, MANAGER |
| GET | `/api/admin/tables/available` | **一鍵開桌的空桌清單**（`?partySize=`，S-07b／S-10b） | COUNTER, MANAGER |
| POST | `/api/admin/tables/{id}/open` | 現場開桌（S-02 點空桌，帶人數；保留中回 `409 TABLE_RESERVED`；115 分鐘內有別筆訂位只由前端強烈提醒，後端不擋） | COUNTER, MANAGER |
| POST | `/api/admin/tables/{id}/clean` | 整理完成 → 空桌 | COUNTER, MANAGER |
| GET | `/api/admin/dining-sessions/{id}` | 桌位詳情（含帳單：品項明細、小計、服務費、合計；S-03「小計 N 項」的 N＝已送出品項的份數加總；**不回購物車**，見 4.8） | COUNTER, MANAGER |
| POST | `/api/admin/dining-sessions/{id}/orders` | 代客加點（body 直接帶品項，**不經過購物車**；`source = STAFF`、`submitted_by_guest_id` 為 NULL） | COUNTER, MANAGER |
| POST | `/api/admin/dining-sessions/{id}/settle` | **櫃檯結清**（`CASH`／`CARD`／`BARCODE`，帶 `expectedTotal`，可帶 `memberId`） | COUNTER, MANAGER |
| POST | `/api/admin/dining-sessions/{id}/cancel` | 取消該次用餐（沒點過餐才可以，見 4.8b） | MANAGER |
| GET | `/api/admin/members/lookup` | 櫃檯用手機查會員（`?phone=`，回暱稱與生日讓客人確認，**進階 8.10**，見 4.8a） | COUNTER, MANAGER |
| GET | `/api/admin/service-calls` | 未處理的服務鈴 | COUNTER, MANAGER |
| PATCH | `/api/admin/service-calls/{id}/ack` | 標記已處理 | COUNTER, MANAGER |
| GET | `/api/admin/kitchen/tickets` | KDS 看板 | KITCHEN, MANAGER |
| PATCH | `/api/admin/order-items/{id}/serve` | 勾選已出餐 | KITCHEN, MANAGER |
| PATCH | `/api/admin/order-tickets/{id}/serve-all` | 整單出完 | KITCHEN, MANAGER |
| PATCH | `/api/admin/order-items/{id}/waste` | 退菜／廢棄 | KITCHEN, MANAGER |
| GET/POST | `/api/admin/waitlist` | 候位清單／登記 | COUNTER, MANAGER |
| POST | `/api/admin/waitlist/{id}/call` | 叫號 | COUNTER, MANAGER |
| POST | `/api/admin/waitlist/{id}/seat` | 報到入座並開桌（**帶 `tableId`**；保留中回 `409 TABLE_RESERVED`） | COUNTER, MANAGER |
| DELETE | `/api/admin/waitlist/{id}` | 放棄 | COUNTER, MANAGER |
| CRUD | `/api/admin/menu/categories` | 分類管理 | MANAGER |
| CRUD | `/api/admin/menu/items` | 品項管理（含上下架） | MANAGER |
| CRUD | `/api/admin/menu/option-groups` | 選項群組管理 | MANAGER |
| CRUD | `/api/admin/tables-config` | 座位管理 | MANAGER |
| GET | `/api/admin/tables-config/{id}/qrcode` | 產生桌位 QR code（PNG，內容 `/t/{tableNo}`） | MANAGER |
| GET | `/api/admin/reservations` | 訂位管理（`?date=`；每列多回 `assignedTableNo`、`holding`（現在是否保留中，決定「保留 A08」小字）、`cancelSource`（`CUSTOMER`／`STAFF`／`null`）、`cancelledByStaffName`（櫃檯取消的才有，顯示「店家代取消・小美」）；`status = CONFIRMED` 就顯示「取消訂位」，跟 `holding` 無關） | COUNTER, MANAGER |
| POST | `/api/admin/reservations/{id}/seat` | 訂位報到並開桌（**帶 `tableId`**） | COUNTER, MANAGER |
| POST | `/api/admin/reservations/{id}/cancel` | **櫃檯代客取消訂位**（M7 7.18，見 4.11d；**隨時可以取消**，不受期限；不是 `CONFIRMED` 回 `409 RESERVATION_NOT_CANCELLABLE`） | COUNTER, MANAGER |
| GET | `/api/admin/inventory` | 庫存清單（低量優先，**進階 A3**） | MANAGER |
| PATCH | `/api/admin/inventory/{menuItemId}` | 調整庫存／補貨（**進階 A3**） | MANAGER |
| GET | `/api/admin/reports/**` | 報表（**進階 A4**） | MANAGER |

### 2.5 排程手動觸發 ★demo 必備

> **你不可能在 demo 時等到晚上 11:30。** 每個排程都要有對應的手動觸發 API。

| 方法 | 路徑 | 對應排程 | 角色 |
|---|---|---|---|
| POST | `/api/admin/scheduler/check-overtime` | 用餐超時掃描 | MANAGER |
| POST | `/api/admin/scheduler/expire-waitlist` | 候位過號標記 | MANAGER |
| POST | `/api/admin/scheduler/remind-cleaning` | 待清理提醒 | MANAGER |
| POST | `/api/admin/scheduler/mark-no-show` | NO_SHOW 標記 | MANAGER |
| POST | `/api/admin/scheduler/send-reminders` | 訂位提醒 | MANAGER |
| POST | `/api/admin/scheduler/check-low-stock` | 低庫存檢查（隨 A3） | MANAGER |
| POST | `/api/admin/scheduler/daily-settlement?date=` | 營業日結算（隨 A4） | MANAGER |
| POST | `/api/admin/scheduler/prep-suggestion?date=` | 明日備貨建議（隨 M5 5.E2） | MANAGER |

> 九支排程裡只有「驗證碼清理」沒有手動觸發：驗證碼改用 Redis TTL 的話，這支排程本身就不需要（見 [M8 問題 2](modules/M8-會員.md)）。
> 舊的「桌位預留轉換」排程已刪除，不會加回來。7.10 這個編號現在是**算出來的**訂位保留，不是排程，所以沒有手動觸發 API（見 4.3e）。

**實作方式**：排程方法只負責「呼叫 Service + 記日誌」，邏輯全在 Service，排程與手動 API 共用同一段程式碼。

---

## 3. WebSocket 事件規格 ★

> 技術說明見 [WebSocket 與 STOMP](../tech/realtime/41-WebSocket與STOMP.md) 與 [前端接 WebSocket](../tech/realtime/42-前端接WebSocket.md)。

### 3.1 連線

```
端點：/ws（原生 WebSocket，不用 SockJS）
身分標頭（放在 STOMP CONNECT frame）：X-Session-Token（顧客端）或 Authorization: Bearer（員工）
```

**連線時必須驗證身分**：HTTP 握手本身不帶權杖，所以 Spring Security 放行 `/ws/**`；
真正的檢查在 `ChannelInterceptor`——CONNECT 時驗身分（兩種都認），SUBSCRIBE 時照 3.2 檢查頻道權限，
否則隔壁桌的人可以訂閱你這桌的頻道。

### 3.2 頻道

| 頻道 | 訂閱者 | 權限 |
|---|---|---|
| `/topic/session/{sessionId}` | 該桌所有裝置 | 持有該桌用餐權杖 |
| `/topic/kitchen` | KDS | `KITCHEN` / `MANAGER` |
| `/topic/counter` | 櫃檯 | `COUNTER` / `MANAGER` |
| `/topic/menu` | 所有點餐中的裝置 | 任何有效權杖 |
| `/topic/waitlist` | 櫃檯與候位螢幕 | `COUNTER` / `MANAGER` |

### 3.3 統一事件格式

```json
{
  "type": "NEW_TICKET",
  "payload": { },
  "serverTime": "2026-09-13T18:42:11+08:00"
}
```

### 3.4 事件類型

| type | 推到哪些頻道 | payload | 前端該做什麼 |
|---|---|---|---|
| `CART_UPDATED` | session | `{ action: ADDED\|UPDATED\|REMOVED, byGuest: "陳小美", byGuestId: 2, itemName, quantity, optionSummary }` | 重抓 `GET /me/cart`、更新購物車角標；`ADDED` 而且 `byGuestId` 不是自己時，跳 C-04b 通知條（標題「陳小美 加了一樣東西」，說明「安格斯霜降牛五花 ×1・全份」） |
| `NEW_TICKET` | session、kitchen | `OrderTicketDto`（含 `quantity`＝這張單的份數加總；推給同桌的那份多帶 `byGuest`、`byGuestId`，櫃檯代客加點是 `"櫃檯"`／`null`，預點轉單兩個都是 `null`） | 加進清單，高亮 2 秒；同桌手機重抓購物車（已被清空）；`byGuest` 不是 `null`、`byGuestId` 也不是自己時，跳 C-04c「王大明 送出 6 項」（N＝payload 的 `quantity`，份數加總） |
| `ITEM_SERVED` | session、kitchen | `{ticketId, itemId, servedAt}` | 該品項狀態改「已出餐」 |
| `TICKET_SERVED` | session、kitchen | `{ticketId}` | KDS 卡片淡出移除 |
| `TICKET_CANCELLED` | session、kitchen | `{ticketId, reason}` | 從清單移除 |
| `ITEM_WASTED` | kitchen | `{itemId, reason}` | 標記退菜 |
| `SESSION_UPDATED` | session、counter | `{subtotal, serviceFee, total, status}` | 更新金額顯示 |
| `SESSION_CLOSED` | session、counter | `{ sessionId, reason: "PAID" \| "CANCELLED" }` | `PAID`：顧客端 C-04 切到「已結帳」面板並清除權杖；`CANCELLED`：**不顯示任何面板**，清掉權杖直接導回 C-00（`/`）；櫃檯更新桌況 |
| `MENU_SOLD_OUT` | menu | `{menuItemId, name}` | 菜單標灰 + 購物車標紅 |
| `MENU_RESTOCKED` | menu | `{menuItemId, quantity}` | 恢復可點 |
| `SERVICE_CALL` | counter | `{callId, tableNo, type}` | 跳出提示 + 音效 |
| `TABLE_STATUS` | counter | `{tableId, tableNo, status, displayStatus, heldFor}` | 依 `displayStatus` 更新桌況色塊（四種）；開桌、結清、清潔、取消用餐、櫃檯代客取消訂位都會推 |
| `TABLE_OVERTIME` | counter | `{tableId, tableNo, minutes}` | 標紅閃爍 |
| `WAITLIST_CALLED` | waitlist | `{ticketNo, partySize}` | 候位螢幕顯示叫號 |
| `WAITLIST_UPDATED` | waitlist、counter | `{waitingCount}` | 更新候位清單 |

**同桌兩個事件的 payload 範例**（推到 `/topic/session/1052`）：

```json
{ "type": "CART_UPDATED",
  "payload": { "action": "ADDED", "byGuest": "陳小美", "byGuestId": 2,
               "itemName": "安格斯霜降牛五花", "quantity": 1, "optionSummary": "全份" } }
```

```json
{ "type": "NEW_TICKET",
  "payload": { "ticketId": 3301, "sequenceNo": 1, "status": "PENDING", "quantity": 6,
               "byGuest": "王大明", "byGuestId": 1, "items": [ ... ] } }
```

- `optionSummary`：這一列選到的選項值名稱，依選項群組的順序用「・」串起來（例：「全份・加蔥花」）；沒有選項就是 `null`。
  C-04b 說明那行＝`itemName ×quantity`，`optionSummary` 不是 `null` 就用「・」接在後面（「安格斯霜降牛五花 ×1・全份」），太長由前端截斷加「…」
- `quantity`（`NEW_TICKET`）：這張單所有品項的**份數加總**，不是列數——白飯 ×2 算 2 項。上面這張單 6 份，C-04c 就是「王大明 送出 6 項」。
  全站的「N 項」都是這樣算（見 [01 名詞定義](01-專案總覽.md)）

### 3.5 兩條鐵律

1. **推播要在資料庫交易「提交之後」才發**，否則前端收到通知去查卻查不到資料。
2. **前端每次（重新）連上都要重抓一次完整資料**。WebSocket 保證「快」，不保證「不漏」。

> **自己的動作不通知自己**：`CART_UPDATED` 與 `NEW_TICKET` 都帶 `byGuestId`（`dining_session_guest.id`），前端跟 join 時拿到的 `guest.id` 比對，
> 相同就只更新畫面、不跳 C-04b／C-04c。**不要比 `byGuest` 名稱**——會員暱稱可能重複。
> 櫃檯代客加點不經過購物車，`byGuest` 是「櫃檯」、`byGuestId` 是 `null`，同桌照樣跳「櫃檯 送出 2 項」；
> 預點轉單發生在開桌當下，同桌還沒有手機加入，兩個都是 `null`，不跳通知。
> 送出點餐**不另推** `CART_UPDATED`：同桌收到 `NEW_TICKET` 就知道購物車被清空了，重抓即可。
>
> **預約保留開始或結束的那一刻沒有事件**（它是算出來的，沒有排程去推）。所以櫃檯桌況頁除了收 `TABLE_STATUS`，
> 還要每 60 秒重抓一次 `GET /api/admin/tables`，最多晚一分鐘換色；按開桌時後端會重算，不會因為畫面舊而開錯。

---

## 4. 關鍵端點詳細規格

### 4.1 查桌位狀態（掃碼後第一支）

```json
GET /api/tables/A03/status
200 OK
{
  "tableNo": "A03",
  "seats": 4,
  "status": "OCCUPIED",
  "canJoin": true,
  "message": null
}
```

| 桌位狀態 | `canJoin` | 前端顯示 |
|---|---|---|
| `AVAILABLE` | false | 「請洽櫃檯帶位」 |
| `OCCUPIED` | true | 直接進入點餐 |
| `CLEANING` | false | 「整理中，請稍候」 |

> 這支回的是 `dining_table.status` 三種之一，**不回預約保留**。保留中的桌對客人來說一樣是還沒開桌，
> 掃到看到「請洽櫃檯帶位」就對了——**對客人來說結果完全相同，前端少一個分支。**
> 預約保留只出現在店家端的 `GET /api/admin/tables`（見 4.3e）。

### 4.2 掃碼加入用餐

```http
POST /api/dining-sessions/join
X-Device-Id: 7f1c2a9e-4b6d-4e2a-9c1f-2d8e5a0b3c71

{ "tableNo": "A03" }
```

```json
201 Created
{
  "sessionId": 1052,
  "sessionToken": "eyJ0IjoxMDUyLi4u",
  "tableNo": "A03",
  "adultCount": 2,
  "childCount": 1,
  "status": "OPEN",
  "openedAt": "2026-09-13T18:30:00+08:00",
  "soupBaseOrdered": false,
  "subtotal": 0.00,
  "guest": { "id": 3, "displayName": "客人 2" }
}
```

`guest` 是這支手機在這桌的身分（`dining_session_guest`）：同一個 `X-Device-Id` 重複加入拿到同一筆，沒有就建立。
有帶會員 JWT 加入、而且會員有填暱稱時 `displayName` 用暱稱，否則依加入順序給「客人 1」「客人 2」…
**它只用來標示誰加的，不是身分驗證**——之後的請求仍然靠 `sessionToken`。
前端把 `guest.id` 跟 `sessionToken` 一起存起來：收到 `CART_UPDATED`／`NEW_TICKET` 時拿它比對 `byGuestId`，自己的動作不跳通知（見 3.4）。

`soupBaseOrdered` 只是資訊，**前端不會因此跳頁**：鍋底是 C-04 的一個分類頁籤，
送出訂單時本桌還沒有鍋底，後端回 `400 SOUP_BASE_REQUIRED`（見 4.5）。

**錯誤**：桌位不是 `OCCUPIED` → `409 TABLE_NOT_OPENED`

### 4.3 現場開桌（S-02 點空桌）

```http
POST /api/admin/tables/3/open
Authorization: Bearer <員工 JWT>
{ "adultCount": 2, "childCount": 1 }
```

後端用悲觀鎖（`SELECT ... FOR UPDATE`）避免同一桌開出兩張帳單。鎖住桌位之後要**重算一次預約保留**（見 4.3e），不能相信畫面上的顏色。
**錯誤**：`409 TABLE_OCCUPIED`；`409 TABLE_RESERVED`「這張桌保留給 陳怡君 18:30，客人來電取消的話請到預約管理取消訂位」

**稍後有訂位不擋**：這張桌 115 分鐘內有別筆訂位（4.3b 的 `upcomingOnThisTable`），前端顯示強烈提醒、主按鈕改成「仍要開桌」並二次確認，確認後照樣打這支，後端**不回錯誤**。

### 4.3b 開桌頁的來源清單

```http
GET /api/admin/tables/12/open-options
```

```json
200 OK
{
  "tableNo": "A03", "seats": 4,
  "waitlist": [
    { "id": 77, "no": "A12", "name": "王先生", "partySize": 3,
      "waitedMinutes": 18, "status": "CALLED" }
  ],
  "reservations": [
    { "id": 442, "reservationNo": "R-260915-0442", "name": "陳怡君",
      "phoneMasked": "0933***210", "startTime": "2026-09-15T18:00:00+08:00",
      "adultCount": 3, "childCount": 1, "partySize": 4,
      "preorderItemCount": 4, "assignedTableNo": "A08" }
  ],
  "heldFor": null,
  "upcomingOnThisTable": {
    "reservationNo": "R-260915-0455", "name": "陳小姐",
    "startTime": "2026-09-15T19:30:00+08:00", "endTime": "2026-09-15T21:25:00+08:00",
    "partySize": 4
  }
}
```

**三段各自的規則**

1. `waitlist`：`status = CALLED`（已叫號待報到）的組別。
2. `reservations`：`status = CONFIRMED`、`start_time` 落在 **現在 −10 分 ～ +30 分**、
   `party_size ≤ seats`。晚到超過 10 分鐘的不列——訂位只保留 10 分鐘，不能等 NO_SHOW 排程來標；
   +30 是最早可報到的時間，跟預約保留的開頭是同一個數字。**不限定 `table_id` 是這張桌**——客人被帶到別張桌是現場常態，
   `assignedTableNo` 只是附帶資訊讓櫃檯知道原本配到哪。`preorderItemCount` 是預點的**份數加總**（「已預先點餐 4 項」），沒預點是 0。
3. `upcomingOnThisTable`：這張桌在**現在 ～ 現在 + 115 分**（用餐 100 分＋清桌 15 分，從 `application.yml` 的兩個設定值相加）內要開始的**別筆** `CONFIRMED` 訂位，取最早的一筆；
   正在保留這張桌的那筆已經放在 `heldFor`，這裡不重複放。沒有就回 `null`。
   不是 `null` 時前端顯示**強烈提醒**（所有開桌頁籤都一樣）：頂部醒目警示條（`--danger` 系淺底＋深字＋警示圖示）
   「A03 在 19:30 有訂位（陳小姐 4 位）。現在開桌，客人可能還沒吃完訂位就到了。」，開桌主按鈕改成「仍要開桌」，
   按下再跳確認框（標題「確定要開 A03？」、「確定開桌」primary／「換一張桌」ghost）。**只提醒、不擋**，後端不因此回錯誤。
4. `heldFor`：這張桌**現在**正保留給哪筆訂位（格式同 4.3e），沒有就回 `null`。不是 `null` 時：
   現場、候位頁籤頂部顯示暖黃條「這張桌保留給 陳怡君 18:30（4 位）。客人來電取消的話，請到預約管理取消訂位」並停用開桌按鈕；
   預約頁籤把這筆置頂，列上兩顆「報到開桌」（primary）「取消訂位」（secondary，打 4.11d 的櫃檯代客取消，二次確認文案同 4.11d）
   （它一定也在 `reservations` 裡，兩個時間窗是同一段）；
   其他預約列的「開桌」一樣停用（開下去會回 `409 TABLE_RESERVED`），除非這筆保留的訂位先被取消。

> **只有訂位會鎖桌，候位不鎖桌**，所以 `heldFor` 只有「訂位」這一種來源；沒有「櫃檯自己把空桌鎖起來」的 API。

> 這支回的全部是即時查詢，**不存任何狀態**；預約保留也是當場算的，理由見 [M2 問題 5](modules/M2-桌位開桌與候位.md)。

### 4.3c 從候位或預約開桌

```http
POST /api/admin/waitlist/77/seat
{ "tableId": 12 }
```

```http
POST /api/admin/reservations/442/seat
{ "tableId": 12 }
```

兩支都回 `4.11c` 的那種結果（`diningSessionId`、`soldOut`…）。**各自要做的收尾不能漏**：

| 來源 | 一定要一起做完的事 |
|---|---|
| 候位 | `waitlist.status` → `SEATED`，人數帶入 `dining_session` |
| 預約 | `reservation.status` → `SEATED`，人數帶入，有預點就轉單扣庫存 |
| 兩者共同 | 桌位轉 `OCCUPIED`、`dining_session` 寫入來源 id |

> **不要去改 `reservation.table_id`。** 那是「訂位當下配的桌」，只服務容量與區間重疊判斷；
> 客人實際坐哪一張，`dining_session`（它的 `table_id` 和 `reservation_id`）已經記下來了。
> 回頭改它會讓訂位容量的歷史資料跟著現場調度一起變動，反而算不準。
> **本專題不做換桌功能**——客人被帶到別張桌是現場常態，但那是用餐紀錄的事，不是訂位的事。

> **這裡不檢查區間重疊。** 客人已經站在櫃檯前面了，這是人為決定，系統不該擋。
> 「這張桌等下有別人訂」的資訊已經在 `upcomingOnThisTable`／`upcomingReservationAt`（115 分鐘窗）給前端做強烈提醒，櫃檯按了「仍要開桌」就照開。
> **唯一會擋的是正在保留中的桌**（`409 TABLE_RESERVED`）：保留窗內那張桌已經是別人的了。
> 預約報到開的是**自己的**保留桌就正常開；報到後這筆轉 `SEATED`，保留條件不成立，保留自己消失。

**錯誤**：`409 TABLE_OCCUPIED`（兩個櫃檯搶同一張桌，後到的拿到，前端重新載入清單）；
`409 TABLE_RESERVED`（候位那支：目標桌保留中；預約那支：目標桌保留給**別筆**訂位）；
預約那支另有 `409 RESERVATION_TOO_EARLY`（`now < start_time − 30 分`）與 `409 RESERVATION_EXPIRED`（`now > start_time + 10 分`），見 4.11c。

**漏做收尾的後果**（驗收要專門測）：狀態沒轉 `SEATED` 的話，那筆預約會
① 繼續出現在下一張桌的開桌清單上，② 過了保留時間被 NO_SHOW 排程標成未到——
客人明明已經坐下，系統卻記成沒來。

### 4.3d 一鍵開桌的空桌清單（S-07b／S-10b）

開桌的第二個入口：**從人出發**。S-07 預約管理、S-10 候位管理每一列按「報到開桌」，跳出對話框選一張空桌。

```http
GET /api/admin/tables/available?partySize=4
GET /api/admin/tables/available?partySize=4&reservationId=442     （從 S-07 預約報到時）
```

```json
200 OK
[
  { "tableId": 8,  "tableNo": "A08", "area": "大廳", "seats": 4, "upcomingReservationAt": null, "isOwnHold": true },
  { "tableId": 6,  "tableNo": "A06", "area": "大廳", "seats": 4, "upcomingReservationAt": null, "isOwnHold": false },
  { "tableId": 11, "tableNo": "B01", "area": "包廂", "seats": 6, "upcomingReservationAt": null, "isOwnHold": false },
  { "tableId": 5,  "tableNo": "A05", "area": "大廳", "seats": 4, "upcomingReservationAt": "19:30", "isOwnHold": false }
]
```

- 只列 `status = AVAILABLE` 且 `seats ≥ partySize` 的桌，**排除正在預約保留中的桌**
- 排序：**原保留桌 → 沒有衝突的桌 → 115 分鐘內有別筆訂位的桌**，各組內再依座位數由小到大、桌號排（上面的 A05 就是有衝突、排到最後）
- 帶 `reservationId`（從 S-07 預約報到）時，這筆**自己的保留桌**也列出來、**排第一**，`isOwnHold = true`，前端標「原保留桌」；
  配到的桌還在用餐中就不會出現，櫃檯從其他空桌挑一張
- `upcomingReservationAt`：這張桌在**現在 ～ 現在 + 115 分**內要開始的別筆 `CONFIRMED` 訂位時間（帶 `reservationId` 時，排除這筆自己），跟 `upcomingOnThisTable` 同一個窗；
  不是 `null` 時卡片用醒目紅字標「19:30 有訂位」，選了這張要按「仍要開桌」再確認一次，**只提醒不擋**
- 空陣列 → 對話框顯示「目前沒有坐得下的空桌」＋「清潔完成或有桌結帳後再試一次」
- 選好之後呼叫 4.3c 的其中一支（帶 `tableId`），收尾與 S-02c／S-02d 完全一樣
- 這支也是即時查詢，不存狀態

### 4.3e 桌況總覽與預約保留（M7 7.10）

```http
GET /api/admin/tables
```

```json
200 OK
[
  { "tableId": 8, "tableNo": "A08", "seats": 4, "area": "大廳",
    "status": "AVAILABLE", "displayStatus": "RESERVED",
    "heldFor": { "reservationId": 442, "reservationNo": "R-260915-0442",
                 "name": "陳怡君", "partySize": 4, "startTime": "2026-09-15T18:30:00+08:00" } },
  { "tableId": 3, "tableNo": "A03", "seats": 4, "area": "大廳",
    "status": "OCCUPIED", "displayStatus": "OCCUPIED", "heldFor": null }
]
```

（其餘欄位如用餐分鐘數略。）

**`displayStatus` 怎麼算**（優先順序：用餐中 ＞ 待清理 ＞ 預約保留 ＞ 空桌）

1. `status` 是 `OCCUPIED` 或 `CLEANING` → 照抄。配到的桌到時間還在用餐中，就**不顯示保留**，客人到了櫃檯從 S-07b 幫他選別張桌
2. `status = AVAILABLE`，而且有一筆訂位同時符合：`table_id` 是這張桌、`status = CONFIRMED`、
   **現在落在 `start_time − 30 分` ～ `start_time + 10 分`** → `RESERVED`，`heldFor` 帶那一筆
3. 其他 → `AVAILABLE`

- 30、10 從 `application.yml` 讀：`reservation.hold-before-minutes: 30`（＝最早可報到）、`reservation.hold-after-minutes: 10`（＝訂位保留時間）
- **不存、不靠排程**：`dining_table.status` 仍然只有三種，`displayStatus` 每次查詢現算。理由見 [M2 問題 5](modules/M2-桌位開桌與候位.md)
- 桌格上只有 `RESERVED` 的桌顯示預約資訊（「18:30 陳○君 4 位」）；其他桌照舊不顯示。統計列「預約保留 N」＝ `displayStatus = RESERVED` 的桌數
- 開桌三支（4.3、4.3c）在 `FOR UPDATE` 鎖住桌位後用同一段邏輯重算，保留中就回 `409 TABLE_RESERVED`

**要解開保留，就是取消那筆訂位**（櫃檯代客取消，見 4.11d）。訂位轉 `CANCELLED`、`table_id` 設 `NULL` 之後，
上面第 2 點的條件不成立，這張桌馬上回到 `AVAILABLE`。沒有「只解除保留、訂位照留」的 API。

### 4.4 品項詳情（含選項群組）

```json
GET /api/menu/items/4
{
  "id": 4,
  "name": "鴛鴦鍋底",
  "price": 0.00,
  "isSoupBase": true,
  "soldOut": false,
  "isVegetarian": false,
  "containsBeef": false,
  "spicyLevel": 0,
  "optionGroups": [
    {
      "id": 5, "name": "左鍋湯底", "minSelect": 1, "maxSelect": 1,
      "values": [
        { "id": 51, "name": "麻辣", "priceDelta": 260.00 },
        { "id": 52, "name": "酸菜白肉", "priceDelta": 230.00 },
        { "id": 53, "name": "昆布", "priceDelta": 210.00 }
      ]
    },
    { "id": 6, "name": "右鍋湯底", "minSelect": 1, "maxSelect": 1, "values": [ ... ] }
  ]
}
```

### 4.5 送出點餐 ★最重要的一支

```http
POST /api/dining-sessions/me/orders
X-Session-Token: eyJ0IjoxMDUyLi4u
X-Device-Id: 7f1c2a9e-4b6d-4e2a-9c1f-2d8e5a0b3c71

（不帶 body：送出的是整桌購物車，內容以後端的 cart_item 為準）
```

> 舊版 body 帶 `items` 陣列（購物車在前端）。2026-09-16 購物車搬到後端、整桌共用之後，**送出點餐不帶品項**，
> 前端不可能送出「跟同桌看到的不一樣」的內容。

```json
201 Created
{
  "ticketId": 3301,
  "sequenceNo": 1,
  "status": "PENDING",
  "quantity": 3,
  "placedAt": "2026-09-13T18:42:11+08:00",
  "items": [ ... ],
  "sessionSubtotal": 1210.00
}
```

**失敗（庫存不足）**

```json
409 Conflict
{
  "code": "ITEM_SOLD_OUT",
  "message": "部分品項已售完，請調整後重新送出",
  "details": [
    { "field": "menuItemId", "message": "美國牛五花 庫存不足（剩 1）", "value": 12 }
  ]
}
```

**失敗（購物車是空的）**

```json
409 Conflict
{ "code": "CART_EMPTY", "message": "購物車是空的，可能同桌已經送出了" }
```

**後端實作要點**

1. 整個方法標 [`@Transactional`](../tech/database/27-交易Transaction.md)
2. `SELECT ... FOR UPDATE` 鎖住這筆 `dining_session`，狀態必須 `OPEN`，否則 `409 SESSION_CLOSED`（跟櫃檯結清搶同一把鎖，見 4.8）
3. **拿到鎖之後**才讀整桌 `cart_item`（含 `cart_item_option`）；一筆都沒有 → `409 CART_EMPTY`
4. **鍋底規則**：本桌目前還沒有未取消的 `is_soup_base` 品項（含預點轉來的單），而這次購物車裡也沒有 → `400 SOUP_BASE_REQUIRED`（共鍋：**每桌至少一份**，不是每人一份）
5. 驗證每個品項的必選群組都有選、複選不超過 `max_select`
6. **依 `menuItemId` 排序後逐項扣庫存**（避免死鎖），`track_inventory=false` 的跳過
7. 用條件式 UPDATE 判斷影響筆數，**任一項失敗整個交易 rollback**，不可以只成立一部分（購物車也原封不動，客人刪掉售完那項再送一次）
8. 建立 ticket（`submitted_by_guest_id` = 按送出的那支手機）+ items + item options，**以菜單現價重算**並寫入名稱與價格快照（`cart_item.unit_price` 只給畫面看，不拿來算錢）
9. **刪掉這批 `cart_item`**（同一個交易）
10. 更新 `dining_session.subtotal`
11. **交易提交後**才推 `NEW_TICKET`（帶 `byGuest`、`byGuestId`；`quantity` 是這張單的份數加總，C-04c「送出 N 項」用它）到 `/topic/session/{id}` 和 `/topic/kitchen`

**兩個人同時按送出**：兩筆請求搶同一列的鎖。先到的把整桌購物車送出並刪掉；後到的拿到鎖時購物車已經空了 → `409 CART_EMPTY`，
前端提示並重抓本桌訂單。所以不會送出兩張重複的單。**第 3 步一定要在第 2 步之後**，先讀再鎖的話兩邊讀到的是同一份。

> **櫃檯代客加點**（`POST /api/admin/dining-sessions/{id}/orders`）**不經過整桌購物車**：body 直接帶品項
> （`{ "items": [{ "menuItemId", "quantity", "optionValueIds", "note" }] }`），第 3 步改成讀 body、第 9 步不刪購物車，其他步驟共用同一段程式。
> `source = STAFF`、`submitted_by_guest_id = NULL`，推 `NEW_TICKET` 時 `byGuest = "櫃檯"`、`byGuestId = null`。客人手機上的購物車不受影響。

### 4.5b 共用購物車

```http
POST /api/dining-sessions/me/cart/items
X-Session-Token: eyJ0IjoxMDUyLi4u
X-Device-Id: 7f1c2a9e-4b6d-4e2a-9c1f-2d8e5a0b3c71

{ "menuItemId": 12, "quantity": 1, "optionValueIds": [12, 41], "note": "不要太熟" }
```

```json
GET /api/dining-sessions/me/cart

200 OK
{
  "items": [
    { "id": 501, "menuItemId": 4, "name": "鴛鴦鍋底", "quantity": 1,
      "options": ["左鍋湯底：麻辣", "右鍋湯底：昆布"], "note": null,
      "unitPrice": 470.00, "lineTotal": 470.00, "soldOut": false,
      "addedBy": { "guestId": 1, "displayName": "王大明" } },
    { "id": 502, "menuItemId": 12, "name": "美國牛五花", "quantity": 2,
      "options": ["份量：全份", "加點配料：加蔥花"], "note": "不要太熟",
      "unitPrice": 370.00, "lineTotal": 740.00, "soldOut": false,
      "addedBy": { "guestId": 2, "displayName": "陳小美" } }
  ],
  "totalQuantity": 3,
  "subtotal": 1210.00
}
```

- **整桌一份**：同桌每支手機拿到的內容一樣；任何人都能改（`PATCH`，body `{ "quantity": 2, "note": "..." }`）或刪（`DELETE`）任何一列
- 每次加入都是新的一列（誰加的才分得清楚），不跟既有的列合併
- 回傳固定是 `{ items, totalQuantity, subtotal }`：`totalQuantity` 是份數加總（購物車角標用），`addedBy` 是 `{ guestId, displayName }`（畫面上的「陳小美 加的」）
- `unitPrice`／`lineTotal`／`subtotal` 只是畫面上的參考（不含服務費），送單時以菜單現價重算
- 加入時就先驗必選群組（`400 OPTION_REQUIRED`）與售完標記（`409 ITEM_SOLD_OUT`）；真正的庫存檢查仍在送出時
- session 不是 `OPEN` → `409 SESSION_CLOSED`；要改的那一列已經不在（例如同桌剛送出）→ `404 NOT_FOUND`，前端重抓購物車
- `totalQuantity` 範例是 3：鴛鴦鍋底 ×1 ＋ 美國牛五花 ×2，**算份數不算列數**（2 列、3 項）
- 每次寫入，**交易提交後**推 `CART_UPDATED` 到 `/topic/session/{id}`（帶 `optionSummary`，見 3.4）；其他手機收到就重抓 `GET /me/cart`，`ADDED` 時跳通知條「陳小美 加了一樣東西／安格斯霜降牛五花 ×1・全份」（`byGuestId` 是自己就不跳）

### 4.6 本桌訂單

```json
GET /api/dining-sessions/me/orders
{
  "sessionStatus": "OPEN",
  "subtotal": 1210.00,
  "soupBaseOrdered": true,
  "tickets": [
    {
      "ticketId": 3301, "sequenceNo": 1, "status": "PREPARING", "quantity": 3,
      "placedAt": "2026-09-13T18:42:11+08:00",
      "items": [
        { "id": 8801, "name": "鴛鴦鍋底", "quantity": 1,
          "options": ["左鍋湯底：麻辣", "右鍋湯底：昆布"],
          "lineTotal": 470.00, "status": "SERVED" },
        { "id": 8802, "name": "美國牛五花", "quantity": 2,
          "options": ["份量：全份", "加點配料：加蔥花"],
          "note": "不要太熟", "lineTotal": 740.00, "status": "PENDING" }
      ]
    }
  ]
}
```

> 每張單的 `quantity` 是份數加總（這張 1 ＋ 2 ＝ 3），C-07 單號下的件數用它，跟 `NEW_TICKET` 的 `quantity` 同一個欄位。

> **這支 API 有 WebSocket 還是要留**：進頁面時要抓一次，斷線重連後也要抓一次。

### 4.7 服務鈴

```http
POST /api/service-calls
X-Session-Token: ...
{ "type": "SOUP" }          // SERVICE / SOUP / POT_CLEAN（沒有結帳，要結帳請到櫃檯）
```

```json
201 Created
{ "callId": 771, "type": "SOUP", "status": "PENDING", "createdAt": "..." }
```

同時推 `SERVICE_CALL` 到 `/topic/counter`。

### 4.8 結帳（基礎：櫃檯結清）

```http
POST /api/admin/dining-sessions/1052/settle
Authorization: Bearer <員工 JWT>

{ "method": "CARD", "expectedTotal": 1562.00, "memberId": null }   // method：CASH／CARD／BARCODE；memberId 選填（進階 8.10，見 4.8a）
```

```json
200 OK
{ "sessionId": 1052, "status": "PAID", "method": "CARD", "total": 1562.00,
  "tableNo": "A03", "tableStatus": "CLEANING", "closedAt": "2026-09-13T20:11:03+08:00" }
```

`expectedTotal` 就是 S-03 畫面上看到的合計（來自 `GET /api/admin/dining-sessions/{id}`）。
後端在**同一個 `@Transactional`** 裡：

1. `SELECT ... FOR UPDATE` 鎖住這筆 `dining_session`（送出點餐也鎖同一列，所以兩邊一定一先一後）
2. 狀態不是 `OPEN` → `409 SESSION_CLOSED`（例如客人剛用 A5 線上付完）
3. 重算合計，用 `compareTo` 跟 `expectedTotal` 比；不相等 → `409 BILL_CHANGED`「金額有變動，請重新確認」，
   錯誤回應多帶一個 `bill`（格式同下面的帳單明細），前端用它重畫
4. 有帶 `memberId` → 寫進 `dining_session.member_id`（已經綁了別的會員 → `409 ALREADY_ATTACHED`）
5. `dining_session` → `PAID`、桌位 → `CLEANING`、寫一筆 `payment`（`status = SUCCESS`，`method` 照 body）、該桌用餐權杖全部失效、整桌購物車刪掉
6. **交易提交後**推 `SESSION_CLOSED`（`{ sessionId, reason: "PAID" }`）到 `/topic/session/{id}` 與 `/topic/counter`

**前端（S-03 → S-03b）**：付款按鈕三顆「現金／信用卡／條碼」，**三顆都走同一個倒數對話框**，只有標題跟著方式變：
現金「收款中，請把現金放進收銀機」、信用卡「信用卡付款中」、條碼「條碼付款中」。
對話框裡是大數字倒數 5 → 0（每秒一格）＋金額＋小字「本系統為教學專題，付款為模擬流程」＋ghost「取消」（倒數中可取消，避免按錯）。
**倒數到 0 才送這支**，送出中不能再取消（6.11）。
成功 → 對話框換成勾勾「結帳完成」，**約 1.5 秒後自動關閉**並回 S-02（不用按按鈕），桌位變待清理；
`409 BILL_CHANGED` → 對話框關閉、帳單刷新並提示「剛剛有人加點，金額更新了」。
**櫃檯結帳不做失敗機率**（線上 A5 的 95% 成功率照舊）。倒數只在前端，取消不需要任何 API。

**購物車裡還沒送出的東西**：結清時直接捨棄（第 5 步），不算錢。**櫃檯不用管購物車**：S-03／S-03b 不顯示任何購物車提示，
`GET /api/admin/dining-sessions/{id}` 也不回購物車資訊；櫃檯只看已經送出的單。客人要那幾樣，就要在結帳前自己送出。

### 4.8a 櫃檯查會員（進階 8.10 的櫃檯入口）

```http
GET /api/admin/members/lookup?phone=0912345678
Authorization: Bearer <員工 JWT>
```

```json
200 OK
{ "memberId": 12, "nickname": "陳小美", "birthday": "1998-04-21" }
```

- 查無 → `404 MEMBER_NOT_FOUND`，畫面顯示「查無此會員」
- 畫面顯示「陳小美・1998/04/21」讓櫃檯唸給客人確認；`birthday` 是 `null` 就顯示「未提供」（`nickname` 也可能是 `null`，一樣顯示「未提供」）。`birthday` 對應 `member.birth_date`。按「確認是本人」才把 `memberId` 放進 settle 的 body；**綁定不另開 API**
- **生日是個資**：只在查詢結果顯示，不寫進任何紀錄（不記日誌、不存進 `payment` 或 `dining_session`）
- S-03 的「會員（選填）」整塊屬進階 8.10（A1／A6 的前提）；不做就整塊拿掉，settle 不帶 `memberId`

### 4.8b 取消該次用餐

```http
POST /api/admin/dining-sessions/1052/cancel
Authorization: Bearer <店長 JWT>
```

```json
200 OK
{ "sessionId": 1052, "status": "CANCELLED", "tableNo": "A03", "tableStatus": "AVAILABLE" }
```

S-03 的「取消該次用餐」，**僅 MANAGER**，給客人沒點餐就離開時用。同一個 `@Transactional` 裡：

1. `SELECT ... FOR UPDATE` 鎖住這筆 `dining_session`；不是 `OPEN` → `409 SESSION_CLOSED`
2. 這桌已經有任何一張 `order_ticket` → `409 SESSION_HAS_ORDERS`「已經有點餐紀錄，請改用結帳」
3. session → `CANCELLED`、桌位**直接回 `AVAILABLE`**（沒用過，不用清潔）、權杖全部失效、刪掉整桌購物車
4. **交易提交後**推 `SESSION_CLOSED`（`{ sessionId, reason: "CANCELLED" }`）到 `/topic/session/{id}` 與 `/topic/counter`，另推 `TABLE_STATUS`

顧客端收到 `reason: "CANCELLED"`：**不顯示任何面板**，清掉權杖直接導回 C-00（`/`）。`PAID` 才顯示 C-04「已結帳」面板。

**帳單明細（進階 A5，C-09 用）**

```json
GET /api/dining-sessions/me/bill
X-Session-Token: eyJ0IjoxMDUyLi4u

200 OK
{
  "sessionId": 1052,
  "status": "OPEN",
  "subtotal": 1420.00,
  "serviceFeeRate": 0.10,
  "serviceFee": 142.00,
  "discount": 0.00,
  "total": 1562.00,
  "peopleCount": 3,
  "perPersonReference": 520.67,
  "items": [ ... ]
}
```

`perPersonReference` 只是參考值（我們不做分帳功能）。`discount` 只有做 A6 才可能不是 0。
**查帳單不改任何狀態**——這一版沒有「結帳中」，也不推任何「鎖定」事件；C-09 頂部只提示「付款成功後這桌就不能再加點」。

### 4.9 模擬付款（進階 A5）

```json
POST /api/payments
{ "diningSessionId": 1052, "method": "LINE_PAY", "expectedTotal": 1562.00 }
// 做 A6 的話再加 "couponId"、"usePoints"，兩個可以同時帶

200 OK
{
  "paymentId": 771,
  "status": "SUCCESS",
  "transactionNo": "MOCK-20260913-000771",
  "amount": 1562.00,
  "paidAt": "2026-09-13T20:11:03+08:00",
  "pointsEarned": 15          // 只有做 A6 才有這個欄位
}
```

- 鎖列、狀態檢查、`expectedTotal` 比對與 4.8 完全相同：`409 BILL_CHANGED` → 回 C-09 提示「剛剛有人加點，金額更新了，請再確認一次」；
  `409 SESSION_CLOSED` → 櫃檯已經先結清了，不會重複收款
- 成功後的收尾也與 4.8 相同（`PAID`、`CLEANING`、權杖失效、整桌購物車刪掉、推 `SESSION_CLOSED`（`reason: PAID`））
- A6 有折抵時，`expectedTotal` 帶**折抵前**的合計（小計＋服務費，就是 C-09 上「合計」那一行），後端比對通過才套用券與點數；實付金額看回應的 `amount`（2026-09-16 定案）
- A6 折抵順序：先扣優惠券（一次最多一張）→ 再用點數（1 點折 1 元，最多折到 0 元）；`pointsEarned` 以**實付金額**計，每滿 100 元 1 點、無條件捨去（1,562 → 15）
- 5% 機率 → `422 PAYMENT_FAILED`，訊息「銀行端驗證失敗，請重試或更換付款方式」，**session 狀態不變，可重試**。
  `FAILED` 的 payment 紀錄要留下來，所以失敗不要用丟例外的方式離開交易（見 [M6 問題 3](modules/M6-結帳.md)）

### 4.10 訂位可訂時段

```json
GET /api/reservations/availability?date=2026-09-20&partySize=4
{
  "date": "2026-09-20",
  "diningMinutes": 100,
  "bufferMinutes": 15,
  "slots": [
    { "time": "11:30", "available": true,  "remainingTables": 5 },
    { "time": "12:00", "available": true,  "remainingTables": 3 },
    { "time": "18:00", "available": false, "remainingTables": 0 },
    { "time": "19:55", "available": true,  "remainingTables": 2 }
  ]
}
```

每 30 分鐘一格。`19:55` 可訂代表「剛好接續」不算衝突（判斷式用 `<` 不是 `<=`）。

### 4.11 建立訂位

```http
POST /api/reservations
{
  "startTime": "2026-09-20T18:00:00+08:00",
  "adultCount": 3,
  "childCount": 1,
  "contactName": "王小明",
  "contactPhone": "0912345678",
  "contactEmail": null
}
```

`contactEmail` 選填（C-16b 的電子信箱），不填就送 `null`；只存不寄。

```json
201 Created
{
  "reservationId": 442,
  "reservationNo": "R-260920-0442",
  "accessToken": "rsv_8f3c1d...",
  "tableNo": "A05",
  "seats": 4,
  "startTime": "2026-09-20T18:00:00+08:00",
  "endTime": "2026-09-20T19:55:00+08:00",
  "status": "CONFIRMED",
  "cancellableUntil": "2026-09-20T17:30:00+08:00",
  "preorderEditableUntil": "2026-09-19T20:00:00+08:00",
  "hasPreorder": false
}
```

**錯誤**：`409 SLOT_UNAVAILABLE`（客滿）；`400 VALIDATION_FAILED`（`startTime` 不在**明天起 30 天內**——C-16c 的月曆已經只給選這段，後端一樣要再擋一次；`GET /availability` 的 `date` 也是同一個範圍）

> **線上訂位只能訂明天以後**，所以同一天不會有新的線上訂位插進來；區間重疊只算 `CONFIRMED` 與「`SEATED` 且用餐紀錄還沒結帳」的理由見 [M7 問題 5](modules/M7-訂位.md)。

`reservationNo` 是預約編號（格式 `R-YYMMDD-流水號`，見 03 的 `reservation.reservation_no`），C-18 用大字顯示。

**這支回 `CONFIRMED` 就是訂位成立了**——沒有付款這一關，前端拿到 201 直接跳 C-18 訂位完成頁，
在那裡才問「要不要先點餐」。`accessToken` 只有匿名訂位需要存起來（localStorage），會員可以忽略。

`cancellableUntil` 與 `preorderEditableUntil` **是兩條線**：

- `cancellableUntil`＝**訂位時間前 30 分鐘**（上例 17:30）：客人線上取消的期限，剛好等於預約保留開始的時間；過了回 `409 CANCEL_DEADLINE_PASSED`，請客人來電、由櫃檯代客取消（4.11d）
- `preorderEditableUntil`＝**用餐日前一天 20:00**（進階 A2）：廚房要有完整一天可以備料；過了回 `409 PREORDER_LOCKED`
- 以前兩者是同一個時間點（前一天 20:00），現在分開。**預點截止維持前一天 20:00**（2026-09-16 定案），廚房要靠前一晚的預點備料

前端拿這兩個時間各自決定按鈕要不要停用，但**後端一定要再擋一次**——前端隱藏按鈕不算權限控制。

後端用悲觀鎖 + `UNIQUE(table_id, start_time)` 雙重保護，見 [區間重疊與訂位排程](../tech/advanced/46-區間重疊與訂位排程.md)。

### 4.11b 預先點餐（進階 7.E1／7.E2）

```http
PUT /api/reservations/442/preorder
X-Reservation-Token: rsv_8f3c1d...        （會員改帶 Authorization: Bearer <JWT>）

{
  "items": [
    { "menuItemId": 12, "quantity": 1, "optionValueIds": [31], "note": null },
    { "menuItemId": 45, "quantity": 3, "optionValueIds": [],   "note": "少油" }
  ]
}
```

```json
200 OK
{
  "reservationId": 442,
  "items": [
    { "id": 901, "name": "招牌麻辣鍋底", "options": ["辣度：小辣"],
      "unitPrice": 380.00, "quantity": 1, "lineTotal": 380.00 },
    { "id": 902, "name": "安格斯霜降牛五花", "options": [],
      "unitPrice": 320.00, "quantity": 3, "lineTotal": 960.00, "note": "少油" }
  ],
  "estimatedTotal": 1340.00,
  "editableUntil": "2026-09-19T20:00:00+08:00",
  "updatedAt": "2026-09-14T22:31:07+08:00"
}
```

**四個重點**

1. **整批覆蓋**。送 `"items": []` 就等於清空（`DELETE` 只是語意更清楚的同義詞）。
2. **`estimatedTotal` 是「預估」不是「應付」**。這裡不產生任何 `payment`，
   金額到店結帳時跟現場加點一起算。回傳金額純粹是讓客人心裡有數。
3. **不檢查庫存、不扣庫存**。庫存在報到轉單那一刻才動，理由見 [M7 問題 7](../spec/modules/M7-訂位.md)。
4. **鍋底規則這裡不擋**。共鍋是「每桌至少一份」，客人可能打算到店再加鍋底，
   預點階段擋下來沒有道理。規則一樣在正式送單時才判：報到轉單時預點裡有鍋底就算數，沒有的話，到店後送出的單要補上。

**錯誤**：`409 PREORDER_LOCKED`（過期限）、`409 ITEM_SOLD_OUT` **不會在這裡出現**、`401`（沒憑證）

### 4.11c 訂位報到開桌（店家端）

```http
POST /api/admin/reservations/442/seat
{ "tableId": 5 }
```

```json
200 OK
{
  "diningSessionId": 1087,
  "tableNo": "A05",
  "adultCount": 3, "childCount": 1,
  "preorderTicketId": 3298,
  "soldOut": [
    { "name": "安格斯霜降牛五花", "quantity": 3, "reason": "庫存不足" }
  ]
}
```

**`soldOut` 一定要顯示在櫃檯畫面上。** 預點不扣庫存，所以客人到店時某一項可能已經賣完；
這些品項會從轉出來的單裡移除，由櫃檯當面跟客人講。
**這不是 bug，是「預點不鎖庫存」這個設計選擇的已知取捨**，驗收時要講得出來。

沒有預點內容時，`preorderTicketId` 為 `null`、`soldOut` 為空陣列——就只是單純開桌。

**報到時間窗要自己檢查**：

- `now < start_time − 30 分` → `409 RESERVATION_TOO_EARLY`「還沒到可報到時間（18:00 起）」
- `now > start_time + 10 分` → `409 RESERVATION_EXPIRED`「已超過保留時間，請改登記候位」。
  不能只靠 NO_SHOW 排程——它每 5 分鐘才跑一次，最多晚 5 分鐘才標。

**目標桌的預約保留**：保留給**別筆**訂位 → `409 TABLE_RESERVED`；是**自己的**保留桌 → 正常開桌。

**跟取消搶同一筆**：報到和櫃檯代客取消（4.11d）可能同時發生，兩支都要先 `SELECT ... FOR UPDATE` 鎖住這筆訂位、再檢查 `status = CONFIRMED`。
取消後到 → `409 RESERVATION_NOT_CANCELLABLE`；報到後到 → 這筆已經是 `CANCELLED`，一定要擋下來、不能開桌。
報到遇到「訂位已不是 `CONFIRMED`」回 `409 RESERVATION_NOT_ACTIVE`「這筆訂位已經取消或已報到」；前端收到後重抓訂位清單。

> 過了保留時間、排程還沒標成 `NO_SHOW` 之前被櫃檯取消的訂位，照實記成 `CANCELLED`（`cancel_source = STAFF`），不另外改算逾時未到（2026-09-16 定案）。

### 4.11d 取消訂位（客人線上取消／櫃檯代客取消）

兩個入口，結果一樣：訂位轉 `CANCELLED`、寫 `cancelled_at`、**`table_id` 設 `NULL`**（釋放 `UNIQUE(table_id, start_time)`），
那張桌的預約保留與那個時段的名額一起釋出。差別只在期限與誰取消的（`cancel_source`）。

| | 客人線上取消（M7 7.8） | 櫃檯代客取消（M7 7.18） |
|---|---|---|
| API | `DELETE /api/reservations/{id}` | `POST /api/admin/reservations/{id}/cancel` |
| 誰 | 會員帶 JWT，匿名帶 `X-Reservation-Token` | COUNTER、MANAGER |
| 期限 | **訂位時間前 30 分鐘**；`now > start_time − 30 分` → `409 CANCEL_DEADLINE_PASSED`「訂位前 30 分鐘內請來電取消」 | **隨時可以取消**，不受任何期限 |
| 狀態不是 `CONFIRMED` | `409 RESERVATION_NOT_CANCELLABLE` | `409 RESERVATION_NOT_CANCELLABLE` |
| 寫入 | `cancel_source = CUSTOMER`，`cancelled_by_staff_id` 留 `NULL` | `cancel_source = STAFF`，`cancelled_by_staff_id` = 登入的員工 |
| 推播 | 不用推（還沒進保留窗，桌況不會變） | **交易提交後**推 `TABLE_STATUS` 到 `/topic/counter` |
| 畫面 | C-18、C-19：「訂位時間前 30 分鐘都可以在這裡取消；之後請來電」 | S-07、S-02d 的「取消訂位」，按下前二次確認 |

**客人線上取消**

```http
DELETE /api/reservations/442
X-Reservation-Token: rsv_8f3c1d...        （會員改帶 Authorization: Bearer <JWT>）
```

```json
200 OK
{ "reservationId": 442, "status": "CANCELLED", "cancelSource": "CUSTOMER",
  "cancelledAt": "2026-09-18T21:10:05+08:00" }
```

- 期限的 30 分就是 `reservation.hold-before-minutes`：**取消期限＝預約保留開始的時間**。所以客人自己取消時，那張桌一定還沒進保留窗；
  **保留開始之後只剩櫃檯能取消**
- 跟預點截止（前一天 20:00）是兩條線，見 4.11

**櫃檯代客取消**

```http
POST /api/admin/reservations/442/cancel
Authorization: Bearer <員工 JWT>
{ "reason": "客人來電取消" }
```

```json
200 OK
{ "reservationId": 442, "status": "CANCELLED", "cancelSource": "STAFF",
  "cancelledAt": "2026-09-15T18:05:12+08:00", "cancelledByStaffName": "小美" }
```

- body 可以不帶；`reason` 選填，只寫進應用程式日誌（哪個員工、哪一筆、為什麼），**資料表不另開欄位**
- 在 `SELECT ... FOR UPDATE` 鎖住這筆訂位**之後**才檢查 `status = CONFIRMED`；兩個櫃檯同時按，後到的拿 `409 RESERVATION_NOT_CANCELLABLE`，前端重抓清單即可
- 這張桌當下正在保留中的話，推播後 A08 立刻變回空桌；還沒進保留窗的話桌況本來就不是預約保留，畫面不會變
- 前端按下前二次確認：「確定要取消 陳怡君 18:30 的訂位嗎？通常是客人來電取消。取消後 A08 會變回空桌，這筆訂位無法恢復。」
- **單向、不能恢復**：沒有恢復訂位的 API。按錯了只能請客人重新訂位（線上只能訂明天以後，當天就請客人現場候位，或由櫃檯直接開桌）
- S-07 那一列變成狀態膠囊「已取消」＋小字「店家代取消・小美」（`cancelledByStaffName` 取 `staff.display_name`）

**客人那邊怎麼看**：`GET /api/reservations/{id}` 與 `GET /api/members/me/reservations` 每筆多回 `cancelSource`；
C-19 的「已取消」頁籤裡，`STAFF` 顯示「店家已代為取消」，`CUSTOMER` 顯示「已取消」。

### 4.12 KDS 看板

```json
GET /api/admin/kitchen/tickets
{
  "tickets": [
    {
      "ticketId": 3298, "tableNo": "B02", "sequenceNo": 1,
      "isPreorder": true,
      "placedAt": "2026-09-13T18:20:00+08:00",
      "waitingMinutes": 22,
      "items": [
        { "id": 8790, "name": "麻辣鍋底", "quantity": 1,
          "options": ["辣度：大辣"], "note": null,
          "status": "PENDING", "cookOrder": 1 }
      ]
    }
  ]
}
```

排序：`is_preorder DESC, placed_at ASC`（預約優先，其次先到先做）。
`cookOrder` 是出餐順序建議：鍋底 1、菜盤 2、火鍋料 3、肉品 4、主食 5、飲料甜點 6。

---

## 5. 前端呼叫封裝

**不要讓每個頁面各自寫 `fetch`。** 統一封裝在 `src/api/client.js`，見 [fetch 串接後端 API](../tech/frontend/40-fetch串接API.md)。

錯誤處理靠 `err.code` 分流：

```js
catch (err) {
  switch (err.code) {
    case 'ITEM_SOLD_OUT':       markSoldOut(err.details); break;
    case 'SOUP_BASE_REQUIRED':  toast.error('這桌還沒點鍋底，共鍋至少要一份'); setCategory('soup-base'); break;
    case 'CART_EMPTY':          toast.info('購物車是空的，可能同桌已經送出了'); refetchCartAndOrders(); break;
    case 'SESSION_CLOSED':                                                // reason 跟 WebSocket 的 SESSION_CLOSED 一樣
      if (err.reason === 'CANCELLED') { localStorage.removeItem('sessionToken'); navigate('/'); }  // 取消用餐：直接回 C-00
      else showClosedState();                                             // 已結帳：C-04 面板，清掉權杖；按「回到首頁」到 C-00
      break;
    case 'BILL_CHANGED':        setBill(err.bill); toast.error('金額有變動，請重新確認'); break;
    case 'INVALID_SESSION_TOKEN':
      localStorage.removeItem('sessionToken');
      navigate('/');                                                      // C-00 首頁
      break;
    default: toast.error(err.message);
  }
}
```

---

## 6. 開發順序（後端）

1. `GET /api/menu/categories` + `GET /api/menu/items` ← **第 1 週要打通這兩支**，前端才有東西接
2. `POST /api/admin/tables/{id}/open` + `POST /api/dining-sessions/join`（開桌頁的三種來源可以晚一點，先做現場那條）
3. 共用購物車四支（`/me/cart`）+ **`POST /api/dining-sessions/me/orders`**（送出整桌購物車，最複雜的一支，留給最有把握的人）
4. `GET /api/dining-sessions/me/orders` + WebSocket 推播
5. `GET /api/admin/kitchen/tickets` + `PATCH .../serve`
6. 櫃檯結清 `settle`（含列鎖與 `expectedTotal` 比對；送出點餐那邊的 `SESSION_CLOSED` 一起做）、取消該次用餐 `cancel`
7. 服務鈴、候位、`GET /api/admin/tables/available`（一鍵開桌）
8. 訂位與排程（**先做到「訂位成立 → 報到開桌」這條線**，含 7.10 預約保留：`displayStatus`、`TABLE_RESERVED`、開桌強烈提醒的 115 分鐘窗；取消訂位兩支（客人 `DELETE`、櫃檯 `cancel`）；預點是後面的事）
9. 會員
10. （有餘力）預先點餐三支 API + 報到轉單（A2）
11. （有餘力）顧客線上結帳 `bill` + `payments`（A5）；消費紀錄（A1）；點數與優惠券（A6）；櫃檯查會員 `members/lookup`（8.10）；人氣推薦 `recommendations`（A7）
