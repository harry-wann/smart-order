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

### 1.3 錯誤碼表

| HTTP | code | 何時發生 | 前端該做什麼 |
|---|---|---|---|
| 400 | `VALIDATION_FAILED` | 欄位驗證失敗 | 在欄位下顯示 `details` 訊息 |
| 400 | `SOUP_BASE_REQUIRED` | 第一單沒有鍋底 | 提示「請先選擇鍋底」 |
| 400 | `OPTION_REQUIRED` | 必選群組沒選 | 標出是哪個群組 |
| 401 | `UNAUTHORIZED` | 未登入或 JWT 失效 | 導回登入頁 |
| 401 | `INVALID_SESSION_TOKEN` | 用餐權杖失效（已結帳或取消） | 清除 localStorage，導回掃碼頁 |
| 403 | `FORBIDDEN` | 角色權限不足 | 顯示「權限不足」 |
| 404 | `NOT_FOUND` | 資源不存在 | 顯示查無資料 |
| 409 | `ITEM_SOLD_OUT` | 送出點餐時品項已售完 | **標紅該品項，整張單未成立** |
| 409 | `TABLE_NOT_OPENED` | 掃碼時該桌尚未開桌 | 顯示「請洽櫃檯帶位」 |
| 409 | `TABLE_OCCUPIED` | 開桌時該桌已在使用 | 顯示「此桌使用中」 |
| 409 | `SESSION_LOCKED` | 已進入結帳，不可加點 | 顯示「結帳中無法加點」 |
| 409 | `ALREADY_CHECKING_OUT` | 重複要求結帳 | 直接導到結帳頁 |
| 409 | `SLOT_UNAVAILABLE` | 訂位時段已客滿 | 重新載入可訂時段 |
| 409 | `PREORDER_LOCKED` | 已過預點修改期限（前一天 20:00） | 停用編輯，顯示請來電 |
| 409 | `RESERVATION_LOCKED` | 已過取消期限，或訂位已報到／已取消 | 停用取消鈕，顯示請來電 |
| 409 | `ALREADY_ATTACHED` | 此次用餐已綁定會員 | — |
| 422 | `PAYMENT_FAILED` | 模擬付款失敗（5%） | 顯示原因 + 重試按鈕 |
| 429 | `TOO_MANY_ATTEMPTS` | 驗證碼太頻繁 | 顯示倒數 |
| 500 | `INTERNAL_ERROR` | 未預期錯誤 | 通用錯誤訊息，**去看後端日誌** |

### 1.4 認證

| 身分 | 標頭 | 取得方式 | 有效期 |
|---|---|---|---|
| 匿名顧客 | `X-Session-Token: <token>` | 掃碼加入時取得 | 到該次結帳為止 |
| 匿名訂位 | `X-Reservation-Token: <token>` | 建立訂位時取得 | 到該筆訂位結束為止 |
| 會員 | `Authorization: Bearer <JWT>` | 手機驗證碼登入 | 7 天 |
| 員工 | `Authorization: Bearer <JWT>` | 帳密登入 | 12 小時 |

顧客端可**同時帶兩個**：用餐權杖說「我坐在哪一桌」，JWT 說「我是誰」。

**權限規則**：`/api/admin/**` 一律需要員工 JWT + 角色檢查。**前端隱藏按鈕不算權限控制**，後端一定要擋（見 [Spring Security](../tech/backend/20-SpringSecurity.md)）。

---

## 2. 端點總表

### 2.1 顧客端 — 用餐與點餐

| 方法 | 路徑 | 說明 | 認證 |
|---|---|---|---|
| GET | `/api/tables/{tableNo}/status` | 查桌位狀態（決定掃碼後顯示什麼） | 無 |
| POST | `/api/dining-sessions/join` | 掃碼加入用餐，取得權杖 | 無 |
| GET | `/api/dining-sessions/me` | 目前用餐資訊 | Session |
| GET | `/api/menu/categories` | 分類清單 | Session |
| GET | `/api/menu/items` | 品項清單（`?categoryId=`） | Session |
| GET | `/api/menu/items/{id}` | 品項詳情（含選項群組） | Session |
| GET | `/api/menu/recommendations` | 推薦（`?type=POPULAR\|HISTORY\|PROFILE&audience=ADULT\|CHILD`） | Session |
| POST | `/api/dining-sessions/me/orders` | **送出購物車 → 建立一張點餐單** | Session |
| GET | `/api/dining-sessions/me/orders` | 本桌所有點餐單 | Session |
| DELETE | `/api/dining-sessions/me/order-items/{id}` | 取消單品 | Session |
| POST | `/api/service-calls` | **按服務鈴** | Session |
| POST | `/api/dining-sessions/me/checkout` | 要求結帳（鎖定） | Session |
| POST | `/api/dining-sessions/me/checkout/cancel` | 取消結帳 | Session |
| POST | `/api/payments` | 模擬付款 | Session |
| POST | `/api/dining-sessions/me/attach-member` | 輸入手機累積點數 | Session |

### 2.2 顧客端 — 會員

| 方法 | 路徑 | 說明 |
|---|---|---|
| POST | `/api/auth/otp/request` | 取得驗證碼（測試模式直接回傳） |
| POST | `/api/auth/otp/verify` | 驗證 → 回 JWT 或「需補資料」 |
| POST | `/api/members` | 補齊資料完成註冊 |
| GET / PATCH | `/api/members/me` | 我的資料 |
| GET | `/api/members/me/sessions` | 消費歷史（分頁） |
| GET | `/api/members/me/sessions/{id}` | 單次消費明細 |
| GET | `/api/members/me/points` | 點數與異動紀錄（進階） |

### 2.3 顧客端 — 訂位

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/reservations/availability` | `?date=&partySize=` → 各時間點剩幾桌 |
| POST | `/api/reservations` | **建立訂位（含配桌），送出即成立** |
| GET | `/api/reservations/{id}` | 訂位詳情（含預點內容） |
| DELETE | `/api/reservations/{id}` | 取消（含期限判定） |
| GET | `/api/members/me/reservations` | 我的訂位 |
| GET | `/api/reservations/{id}/preorder` | 目前的預點內容（進階） |
| PUT | `/api/reservations/{id}/preorder` | **整批覆蓋**預點內容，新增與調整共用（進階） |
| DELETE | `/api/reservations/{id}/preorder` | 清空預點（進階） |

> **預點用 `PUT` 整批覆蓋，不做部分更新。** 前端本來就有購物車，把整份送上來最直覺；
> 後端 `deleteByReservationId` 再重建，不用寫 diff；重送同一份結果一樣（冪等）。
> 「先點餐」和「調整餐點」是同一支 API、同一個畫面（C-17）。
>
> **存取控制**：會員帶 JWT，匿名帶 `X-Reservation-Token`。
> 兩者都沒有就回 `401`——只憑 `{id}` 不可以動別人的訂位。

### 2.4 店家端 `/api/admin`

| 方法 | 路徑 | 說明 | 角色 |
|---|---|---|---|
| POST | `/api/admin/auth/login` | 員工登入 | — |
| GET | `/api/admin/tables` | 桌況總覽 | 全部 |
| GET | `/api/admin/tables/{id}/open-options` | **開桌頁要的兩份清單**：可報到的候位與預約 | COUNTER, MANAGER |
| POST | `/api/admin/tables/{id}/open` | 櫃檯開桌（現場，帶人數） | COUNTER, MANAGER |
| POST | `/api/admin/tables/{id}/clean` | 整理完成 → 空桌 | COUNTER, MANAGER |
| GET | `/api/admin/dining-sessions/{id}` | 桌位詳情 | COUNTER, MANAGER |
| POST | `/api/admin/dining-sessions/{id}/orders` | 代客加點 | COUNTER, MANAGER |
| POST | `/api/admin/dining-sessions/{id}/settle` | **標記已結清**（現金或模擬支付） | COUNTER, MANAGER |
| POST | `/api/admin/dining-sessions/{id}/cancel` | 取消該次用餐 | MANAGER |
| GET | `/api/admin/service-calls` | 未處理的服務鈴 | COUNTER, MANAGER |
| PATCH | `/api/admin/service-calls/{id}/ack` | 標記已處理 | COUNTER, MANAGER |
| GET | `/api/admin/kitchen/tickets` | KDS 看板 | KITCHEN, MANAGER |
| PATCH | `/api/admin/order-items/{id}/serve` | 勾選已出餐 | KITCHEN, MANAGER |
| PATCH | `/api/admin/order-tickets/{id}/serve-all` | 整單出完 | KITCHEN, MANAGER |
| PATCH | `/api/admin/order-items/{id}/waste` | 退菜／廢棄 | KITCHEN, MANAGER |
| GET/POST | `/api/admin/waitlist` | 候位清單／登記 | COUNTER, MANAGER |
| POST | `/api/admin/waitlist/{id}/call` | 叫號 | COUNTER, MANAGER |
| POST | `/api/admin/waitlist/{id}/seat` | 報到入座（自動開桌） | COUNTER, MANAGER |
| DELETE | `/api/admin/waitlist/{id}` | 放棄 | COUNTER, MANAGER |
| CRUD | `/api/admin/menu/categories` | 分類管理 | MANAGER |
| CRUD | `/api/admin/menu/items` | 品項管理（含上下架） | MANAGER |
| CRUD | `/api/admin/menu/option-groups` | 選項群組管理 | MANAGER |
| GET | `/api/admin/menu/items/{id}/qrcode` | 產生桌位 QR code（PNG） | MANAGER |
| CRUD | `/api/admin/tables-config` | 座位管理 | MANAGER |
| GET | `/api/admin/reservations` | 訂位管理（`?date=`） | COUNTER, MANAGER |
| POST | `/api/admin/reservations/{id}/seat` | 訂位報到並開桌（**帶 `tableId`**） | COUNTER, MANAGER |
| GET | `/api/admin/inventory` | 庫存清單（低量優先） | MANAGER |
| PATCH | `/api/admin/inventory/{menuItemId}` | 調整庫存／補貨 | MANAGER |
| GET | `/api/admin/reports/**` | 報表（進階） | MANAGER |

### 2.5 排程手動觸發 ★demo 必備

> **你不可能在 demo 時等到晚上 11:30。** 每個排程都要有對應的手動觸發 API。

| 方法 | 路徑 | 對應排程 | 角色 |
|---|---|---|---|
| POST | `/api/admin/scheduler/check-overtime` | 用餐超時掃描 | MANAGER |
| POST | `/api/admin/scheduler/expire-waitlist` | 候位過號標記 | MANAGER |
| POST | `/api/admin/scheduler/remind-cleaning` | 待清理提醒 | MANAGER |
| POST | `/api/admin/scheduler/mark-no-show` | NO_SHOW 標記 | MANAGER |
| POST | `/api/admin/scheduler/send-reminders` | 訂位提醒 | MANAGER |
| POST | `/api/admin/scheduler/check-low-stock` | 低庫存檢查 | MANAGER |
| POST | `/api/admin/scheduler/daily-settlement?date=` | 營業日結算 | MANAGER |
| POST | `/api/admin/scheduler/prep-suggestion?date=` | 明日備貨建議 | MANAGER |

**實作方式**：排程方法只負責「呼叫 Service + 記日誌」，邏輯全在 Service，排程與手動 API 共用同一段程式碼。

---

## 3. WebSocket 事件規格 ★

> 技術說明見 [WebSocket 與 STOMP](../tech/realtime/41-WebSocket與STOMP.md) 與 [前端接 WebSocket](../tech/realtime/42-前端接WebSocket.md)。

### 3.1 連線

```
端點：/ws（SockJS fallback）
握手標頭：X-Session-Token（顧客端）或 Authorization: Bearer（員工）
```

**握手時必須驗證身分**（`ChannelInterceptor` 攔 CONNECT frame），否則隔壁桌的人可以訂閱你這桌的頻道。

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
| `NEW_TICKET` | session、kitchen | `OrderTicketDto` | 加進清單，高亮 2 秒 |
| `ITEM_SERVED` | session、kitchen | `{ticketId, itemId, servedAt}` | 該品項狀態改「已出餐」 |
| `TICKET_SERVED` | session、kitchen | `{ticketId}` | KDS 卡片淡出移除 |
| `TICKET_CANCELLED` | session、kitchen | `{ticketId, reason}` | 從清單移除 |
| `ITEM_WASTED` | kitchen | `{itemId, reason}` | 標記退菜 |
| `SESSION_UPDATED` | session、counter | `{subtotal, serviceFee, total, status}` | 更新金額顯示 |
| `SESSION_LOCKED` | session | `null` | 顯示「結帳中無法加點」 |
| `SESSION_CLOSED` | session、counter | `{sessionId}` | 清除權杖，導回掃碼頁 |
| `MENU_SOLD_OUT` | menu | `{menuItemId, name}` | 菜單標灰 + 購物車標紅 |
| `MENU_RESTOCKED` | menu | `{menuItemId, quantity}` | 恢復可點 |
| `SERVICE_CALL` | counter | `{callId, tableNo, type}` | 跳出提示 + 音效 |
| `TABLE_STATUS` | counter | `{tableId, tableNo, status}` | 更新桌況色塊 |
| `TABLE_OVERTIME` | counter | `{tableId, tableNo, minutes}` | 標紅閃爍 |
| `WAITLIST_CALLED` | waitlist | `{ticketNo, partySize}` | 候位螢幕顯示叫號 |
| `WAITLIST_UPDATED` | waitlist、counter | `{waitingCount}` | 更新候位清單 |

### 3.5 兩條鐵律

1. **推播要在資料庫交易「提交之後」才發**，否則前端收到通知去查卻查不到資料。
2. **前端每次（重新）連上都要重抓一次完整資料**。WebSocket 保證「快」，不保證「不漏」。

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
  "requireSessionCode": false,
  "message": null
}
```

| 桌位狀態 | `canJoin` | 前端顯示 |
|---|---|---|
| `AVAILABLE` | false | 「請洽櫃檯帶位」 |
| `OCCUPIED` | true | 直接進入點餐 |
| `CLEANING` | false | 「整理中，請稍候」 |

> 舊版還有一個 `RESERVED`（顯示「此桌已預約，請洽櫃檯」）。桌位狀態拿掉它之後，
> 已被預約但還沒報到的桌就是 `AVAILABLE`，客人掃到一樣看到「請洽櫃檯帶位」——
> **對客人來說結果完全相同，前端少一個分支。**

### 4.2 掃碼加入用餐

```http
POST /api/dining-sessions/join
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
  "subtotal": 0.00
}
```

`soupBaseOrdered = false` → 前端跳到選鍋底頁。

**錯誤**：桌位不是 `OCCUPIED` → `409 TABLE_NOT_OPENED`

### 4.3 櫃檯開桌

```http
POST /api/admin/tables/3/open
Authorization: Bearer <員工 JWT>
{ "adultCount": 2, "childCount": 1 }
```

後端用悲觀鎖（`SELECT ... FOR UPDATE`）避免同一桌開出兩張帳單。
**錯誤**：`409 TABLE_OCCUPIED`

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
  "upcomingOnThisTable": {
    "reservationNo": "R-260915-0455", "name": "陳小姐",
    "startTime": "2026-09-15T19:30:00+08:00", "endTime": "2026-09-15T21:25:00+08:00",
    "partySize": 4
  }
}
```

**三段各自的規則**

1. `waitlist`：`status = CALLED`（已叫號待報到）的組別。
2. `reservations`：`status = CONFIRMED`、`start_time` 落在 **現在 −15 分 ～ +45 分**、
   `party_size ≤ seats`。**不限定 `table_id` 是這張桌**——客人被帶到別張桌是現場常態，
   `assignedTableNo` 只是附帶資訊讓櫃檯知道原本配到哪。
3. `upcomingOnThisTable`：這張桌接下來最近的一筆訂位，**純提醒**，前端畫成黃字警示。
   沒有就回 `null`。
> **延伸功能（M2 的 2.E5）要做手動保留的話**，這支再多回一個 `heldFor`
> （這張桌保留給哪一筆），前端把對應的那一列置頂標示；另外加
> `POST` / `DELETE /api/admin/tables/{id}/hold` 兩支。基礎不做。

> 這支回的全部是即時查詢，**不存任何狀態**。桌位不預留的理由見 [M2 問題 5](modules/M2-桌位開桌與候位.md)。

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
> 「這張桌等下有別人訂」的資訊已經在 `upcomingOnThisTable` 給前端顯示過了。

**漏做收尾的後果**（驗收要專門測）：狀態沒轉 `SEATED` 的話，那筆預約會
① 繼續出現在下一張桌的開桌清單上，② 20 分鐘後被 NO_SHOW 排程標成未到——
客人明明已經坐下，系統卻記成沒來。

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

{
  "items": [
    { "menuItemId": 4,  "quantity": 1, "optionValueIds": [51, 53] },
    { "menuItemId": 12, "quantity": 2, "optionValueIds": [12, 41], "note": "不要太熟" }
  ]
}
```

```json
201 Created
{
  "ticketId": 3301,
  "sequenceNo": 1,
  "status": "PENDING",
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

**後端實作要點**

1. 整個方法標 [`@Transactional`](../tech/database/27-交易Transaction.md)
2. 驗證 session 狀態必須 `OPEN`，否則 `409 SESSION_LOCKED`
3. **鍋底規則**：若這是第一張單且不含 `is_soup_base` 品項 → `400 SOUP_BASE_REQUIRED`（共鍋：**每桌至少一份**，不是每人一份）
4. 驗證每個品項的必選群組都有選、複選不超過 `max_select`
5. **依 `menuItemId` 排序後逐項扣庫存**（避免死鎖），`track_inventory=false` 的跳過
6. 用條件式 UPDATE 判斷影響筆數，**任一項失敗整個交易 rollback**，不可以只成立一部分
7. 建立 ticket + items + item options，寫入名稱與價格快照
8. 更新 `dining_session.subtotal`
9. **交易提交後**才推 WebSocket（`/topic/session/{id}` 和 `/topic/kitchen`）

### 4.6 本桌訂單

```json
GET /api/dining-sessions/me/orders
{
  "sessionStatus": "OPEN",
  "subtotal": 1210.00,
  "soupBaseOrdered": true,
  "tickets": [
    {
      "ticketId": 3301, "sequenceNo": 1, "status": "PREPARING",
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

> **這支 API 有 WebSocket 還是要留**：進頁面時要抓一次，斷線重連後也要抓一次。

### 4.7 服務鈴

```http
POST /api/service-calls
X-Session-Token: ...
{ "type": "SOUP" }          // SERVICE / SOUP / POT_CLEAN / CHECKOUT
```

```json
201 Created
{ "callId": 771, "type": "SOUP", "status": "PENDING", "createdAt": "..." }
```

同時推 `SERVICE_CALL` 到 `/topic/counter`。

### 4.8 結帳

```json
POST /api/dining-sessions/me/checkout
{
  "sessionId": 1052,
  "status": "CHECKOUT_PENDING",
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

`perPersonReference` 只是參考值（我們不做分帳功能）。
同時推 `SESSION_LOCKED` 到 `/topic/session/{id}`，讓同桌其他裝置知道。

### 4.9 模擬付款

```json
POST /api/payments
{ "diningSessionId": 1052, "method": "LINE_PAY" }

200 OK
{
  "paymentId": 771,
  "status": "SUCCESS",
  "transactionNo": "MOCK-20260913-000771",
  "amount": 1562.00,
  "paidAt": "2026-09-13T20:11:03+08:00",
  "pointsEarned": 15
}
```

5% 機率 → `422 PAYMENT_FAILED`，訊息「銀行端驗證失敗，請重試或更換付款方式」，**session 狀態不變，可重試**。

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
  "contactPhone": "0912345678"
}
```

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
  "cancellableUntil": "2026-09-19T20:00:00+08:00",
  "preorderEditableUntil": "2026-09-19T20:00:00+08:00",
  "hasPreorder": false
}
```

**錯誤**：`409 SLOT_UNAVAILABLE`（客滿）

**這支回 `CONFIRMED` 就是訂位成立了**——沒有付款這一關，前端拿到 201 直接跳 C-18 訂位完成頁，
在那裡才問「要不要先點餐」。`accessToken` 只有匿名訂位需要存起來（localStorage），會員可以忽略。

`cancellableUntil` 與 `preorderEditableUntil` **是同一個時間點**（用餐日前一天 20:00）：
一條規則比兩條好記，廚房也有完整一天可以備料。前端拿這個時間去決定按鈕要不要停用，
但**後端一定要再擋一次**——前端隱藏按鈕不算權限控制。

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
   預點階段擋下來沒有道理。規則一樣在正式送單時才判（報到轉單後補點的第一張單）。

**錯誤**：`409 PREORDER_LOCKED`（過期限）、`409 ITEM_SOLD_OUT` **不會在這裡出現**、`401`（沒憑證）

### 4.11c 訂位報到開桌（店家端）

```http
POST /api/admin/reservations/442/seat
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
    case 'SOUP_BASE_REQUIRED':  navigate('/order/soup-base'); break;
    case 'SESSION_LOCKED':      toast.error('結帳中無法加點'); break;
    case 'INVALID_SESSION_TOKEN':
      localStorage.removeItem('sessionToken');
      navigate('/');
      break;
    default: toast.error(err.message);
  }
}
```

---

## 6. 開發順序（後端）

1. `GET /api/menu/categories` + `GET /api/menu/items` ← **第 1 週要打通這兩支**，前端才有東西接
2. `POST /api/admin/tables/{id}/open` + `POST /api/dining-sessions/join`（開桌頁的三種來源可以晚一點，先做現場那條）
3. **`POST /api/dining-sessions/me/orders`**（最複雜的一支，留給最有把握的人）
4. `GET /api/dining-sessions/me/orders` + WebSocket 推播
5. `GET /api/admin/kitchen/tickets` + `PATCH .../serve`
6. 結帳與付款
7. 服務鈴、候位
8. 訂位與排程（**先做到「訂位成立 → 報到開桌」這條線**，預點是後面的事）
9. 會員
10. （有餘力）預先點餐三支 API + 報到轉單
