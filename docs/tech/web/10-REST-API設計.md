# REST API 設計

**難度** ★★☆☆☆　**用在哪些模組** 全員　**哪幾週** 第 1 週

## 一句話

REST 是一套**幫網址取名字的習慣**：網址講「東西」，動詞講「動作」。

## 想像一下

如果沒有規矩，五個人會設計出五種網址：

```
/getMenuItems
/api/menu_list
/menu/query?action=list
/取得菜單
/listAllItemsForCategory
```

一團亂。誰都記不住，前端每支 API 都要問。

REST 的想法很單純：

> **網址只講「哪個東西」，要做什麼用 HTTP 方法講。**

所以菜單品項這個「東西」，網址就固定是 `/api/menu/items`。要做什麼，看你用什麼方法：

| 方法 | 網址 | 意思 |
|---|---|---|
| `GET` | `/api/menu/items` | 給我全部品項 |
| `GET` | `/api/menu/items/12` | 給我第 12 號品項 |
| `POST` | `/api/menu/items` | 新增一個品項 |
| `PATCH` | `/api/menu/items/12` | 修改第 12 號 |
| `DELETE` | `/api/menu/items/12` | 刪掉第 12 號 |

**一個網址，五種動作。** 不用取五個名字。

## 五條規則

**① 用名詞，不用動詞**

```
❌ /api/getMenuItems
✅ GET /api/menu/items
```

**② 用複數**

```
❌ /api/menu/item/12
✅ /api/menu/items/12
```

**③ 層級表達歸屬關係**

```
GET /api/dining-sessions/1052/orders   ← 1052 這次用餐的所有點餐單
```

**但不要超過三層。** `/api/a/1/b/2/c/3/d` 這種沒人看得懂。

**④ 篩選、排序、分頁用查詢參數**

```
GET /api/menu/items?categoryId=2&keyword=牛&page=0&size=20
```

**⑤ 小寫，多字用連字號**

```
❌ /api/diningSessions  /api/dining_sessions
✅ /api/dining-sessions
```

（注意：**網址用連字號，JSON 欄位用 camelCase**，這兩個不一樣。）

## 動作型的怎麼辦

有些事情不是單純的增刪改查，例如「開桌」「結帳」「勾選已出餐」。

這時候可以在資源後面加一個動作：

```
POST  /api/admin/tables/3/open                     開桌
POST  /api/admin/dining-sessions/1052/settle       櫃檯結清
POST  /api/admin/dining-sessions/1052/cancel       取消該次用餐
POST  /api/admin/reservations/442/cancel           櫃檯代客取消訂位（隨時可取消，單向，不能恢復）
PATCH /api/admin/order-items/8801/serve            勾選已出餐
```

**用 `POST` 或 `PATCH`，不要用 `GET`。** 這些都會改資料。

## 在我們的專案裡

```
GET    /api/menu/categories                  分類清單
GET    /api/menu/items?categoryId=2          品項清單
GET    /api/menu/items/12                    品項詳情（含選項群組）
POST   /api/dining-sessions/join             掃碼加入
GET    /api/dining-sessions/me               我這桌的狀態
GET    /api/dining-sessions/me/cart          整桌共用的購物車
POST   /api/dining-sessions/me/cart/items    加入購物車
PATCH  /api/dining-sessions/me/cart/items/5501  改數量、備註
DELETE /api/dining-sessions/me/cart/items/5501  刪掉一列
POST   /api/dining-sessions/me/orders        送出點餐（不帶品項，整桌購物車一起送）
GET    /api/dining-sessions/me/orders        本桌所有點餐單
POST   /api/service-calls                    按服務鈴
GET    /api/admin/tables                     桌況總覽（含算出來的「預約保留」）
POST   /api/admin/tables/3/open              開桌（櫃檯點空桌）
POST   /api/admin/dining-sessions/1052/settle 櫃檯結清（現金／信用卡／條碼，可綁會員）
GET    /api/admin/kitchen/tickets            出菜看板
```

購物車那幾行是很好的例子：**購物車是一個資源，裡面的每一列是子資源**，所以「改一列」用 `PATCH …/items/5501`、「刪一列」用 `DELETE …/items/5501`，不用另外發明 `/updateCartItem` 這種網址。

（開桌和結帳都在櫃檯做。客人在手機上自己付款是進階 A5，基礎版一律到櫃檯結帳。）

看得出規律嗎？**看到網址就大概知道它在做什麼**，這就是 REST 的價值。

## 為什麼有 `/me`

`/api/dining-sessions/me` 的 `me` 代表「帶著這個 token 的那一桌」。

好處是前端不用自己記 session id，也**不會有人改個數字就看到別桌的資料**——因為後端是從 token 判斷，不是從網址。

## 15 分鐘動手小練習

幫「候位」這個功能設計 API。需要這些動作：

1. 現場登記候位
2. 看目前候位清單
3. 叫某一組的號
4. 某一組報到入座
5. 某一組放棄

自己先寫寫看，再看下面的答案：

```
POST   /api/admin/waitlist              登記
GET    /api/admin/waitlist              清單
POST   /api/admin/waitlist/{id}/call    叫號
POST   /api/admin/waitlist/{id}/seat    報到入座
DELETE /api/admin/waitlist/{id}         放棄
```

你設計的跟這個差多少？差不多就代表你抓到規律了。

## 你會遇到的坑

**① 網址裡放動詞**
`/api/createOrder`、`/api/deleteItem`——這是最常見的。

**② 用 GET 做會改資料的事**
`GET /api/orders/5/cancel` ← 危險。瀏覽器可能自動重複發送。

**③ 前後端命名不一致**
後端叫 `orderTicket`，前端叫 `order`，聊天時叫「訂單」。**一定要照 [專案總覽](../../spec/01-專案總覽.md) 的名詞表統一。**

**④ 回傳格式每支 API 都不一樣**
一支包一層 `{data: ...}`，另一支直接回。前端會崩潰。我們的規定是：**成功直接回資料，失敗統一回錯誤物件**。

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 東西 | 資源 resource |
| 網址 | endpoint 端點 |
| `?` 後面那串 | query parameter 查詢參數 |
| 網址裡的 `{id}` | path variable 路徑參數 |
| 一整套設計習慣 | REST / RESTful |

## 自我檢核

1. 為什麼網址不能寫 `/api/getMenuItems`？
2. 「開桌」這種不是增刪改查的動作，網址怎麼設計？
3. `/me` 的好處是什麼？
4. 網址用哪種命名？JSON 欄位用哪種？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [MDN：什麼是 REST](https://developer.mozilla.org/zh-TW/docs/Glossary/REST) | 繁中 | 入門 | 5 分 |
| 直接讀我們的 [04-API 規格](../../spec/04-API規格.md)，那就是最好的範例 | 繁中 | 入門 | 20 分 |

## 相關頁面

[HTTP 請求與回應](07-HTTP請求與回應.md)　[HTTP 狀態碼](08-HTTP狀態碼.md)　[Swagger](../backend/19-Swagger.md)　[課程 06：REST 合約](../../spring-boot/tutorial/unit-06-rest-api.html)
