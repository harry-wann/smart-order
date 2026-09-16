# HTTP 請求與回應

**難度** ★★☆☆☆　**用在哪些模組** 全員　**哪幾週** 第 0 週

## 一句話

HTTP 就是**點餐的規矩**：你說一句（請求），廚房回一句（回應），然後這輪就結束了。

## 想像一下

你去櫃檯點餐：

> **你**：「我要一份牛五花，全份，加蔥花。」　← 請求
> **店員**：「好的，280 元，單號 A012。」　← 回應

講完就結束。店員不會突然在你回座位後又跑來跟你說話——**除非你再去問一次**。

HTTP 就是這樣的規矩。前端問一次，後端答一次，關係結束。後端**沒辦法主動**來找前端。（想要主動通知？那要用 [WebSocket](../realtime/41-WebSocket與STOMP.md)。）

## 一個請求由四個部分組成

還是用點餐比喻：

| 部分 | 比喻 | 例子 |
|---|---|---|
| **方法** method | 你要做什麼動作 | `GET`（我要看）`POST`（我要新增） |
| **網址** URL | 你要找哪個櫃檯 | `/api/menu/items` |
| **標頭** headers | 附註資訊，像會員卡 | `Authorization: Bearer eyJ...` |
| **內容** body | 你要交出去的東西 | `{"menuItemId": 12, "quantity": 2}` |

回應則是三個部分：

| 部分 | 比喻 | 例子 |
|---|---|---|
| **狀態碼** status | 成功還是失敗 | `200` 成功、`404` 找不到 |
| **標頭** headers | 附註 | `Content-Type: application/json` |
| **內容** body | 給你的東西 | `{"id": 12, "name": "美國牛五花"}` |

## 四個方法

| 方法 | 中文 | 什麼時候用 | 例子 |
|---|---|---|---|
| `GET` | 給我看 | 只是查東西，不會改到任何資料 | 看菜單 |
| `POST` | 幫我新增 | 建立新東西 | 送出點餐 |
| `PUT` / `PATCH` | 幫我改 | 改既有的東西 | 修改品項價格 |
| `DELETE` | 幫我刪 | 刪掉 | 取消預約 |

**最重要的規則**：`GET` **絕對不能改資料**。因為瀏覽器可能會自動幫你重複發 GET 請求（預先載入、重新整理），如果 GET 會扣庫存，庫存會被莫名其妙扣光。

## 一個真實的例子

把兩份牛五花加進購物車的請求：

```http
POST /api/dining-sessions/me/cart/items      ← 方法 + 網址
X-Session-Token: eyJ0IjoxMDUyLi4u            ← 標頭：證明我坐在 A03 桌
X-Device-Id: 3f2a9c1e-…                      ← 標頭：這是哪一支手機（顯示「陳小美 加的」用）
Content-Type: application/json               ← 標頭：我送的是 JSON

{                                            ← 內容
  "menuItemId": 12,
  "quantity": 2,
  "optionValueIds": [12, 41],
  "note": "不要太熟"
}
```

購物車是整桌共用的，大家一項一項加進去；最後按「送出整桌點餐」時，請求**沒有內容**，後端直接拿整桌購物車出單：

```http
POST /api/dining-sessions/me/orders          ← 沒有 body
X-Session-Token: eyJ0IjoxMDUyLi4u
X-Device-Id: 3f2a9c1e-…
```

後端的回應：

```http
201 Created                                  ← 狀態碼：建立成功
Content-Type: application/json

{
  "ticketId": 3301,
  "sequenceNo": 2,
  "status": "PENDING"
}
```

## 網址的組成

```
https://api.example.com/api/menu/items?categoryId=2&keyword=牛
└─┬─┘  └──────┬──────┘└──────┬──────┘ └──────────┬──────────┘
 協定       主機名稱         路徑              查詢參數
```

**查詢參數（`?` 後面那串）** 用來做篩選、分頁、排序。多個參數用 `&` 連接。

## 15 分鐘動手小練習

1. 打開 Chrome，按 F12，切到 **Network** 分頁
2. 去任何一個網站，重新整理
3. 點開其中一個請求，你會看到：
   - **Headers** 分頁：方法、網址、狀態碼、標頭
   - **Payload** 分頁：你送出去的內容
   - **Response** 分頁：後端回來的內容
4. 找一個回傳 JSON 的請求，看看它長什麼樣

**這個 Network 分頁是你以後 debug 的主戰場。** 前端說「我送出去了」、後端說「我沒收到」的時候，打開這裡就知道誰對。

## 你會遇到的坑

**① 用 GET 做會改資料的事**
`GET /api/orders/delete?id=5` ← 絕對不要這樣寫。

**② 忘記帶 `Content-Type: application/json`**
後端會看不懂你送的東西，噴 415 錯誤。

**③ 以為後端可以主動推訊息**
HTTP 做不到。要即時通知得用 WebSocket。

**④ 把敏感資料放在網址的查詢參數裡**
網址會被記錄在瀏覽器歷史、伺服器日誌裡。密碼、token 一律放在標頭或 body。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `415 Unsupported Media Type` | 我看不懂你送的格式 | 加 `Content-Type: application/json` |
| `405 Method Not Allowed` | 這個網址不接受這個方法 | 你用 GET 打了一個只收 POST 的網址 |
| `ERR_CONNECTION_REFUSED` | 根本連不上 | 後端沒開，或網址／埠號錯了 |
| `Failed to fetch` | 請求發不出去 | 多半是 [CORS](11-CORS跨來源.md) 或後端沒開 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 問一句 | 請求 request |
| 答一句 | 回應 response |
| 我要做什麼動作 | HTTP method / 動詞 |
| 附註資訊 | header 標頭 |
| 送出去／收回來的內容 | body / payload |
| 網址 `?` 後面那串 | query string 查詢參數 |

## 自我檢核

1. 請求由哪四個部分組成？
2. 為什麼 GET 不能改資料？
3. 後端可以主動推訊息給前端嗎？
4. 前端說「我送出去了」、後端說「沒收到」，你要去哪裡看誰對？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [MDN：HTTP 概觀](https://developer.mozilla.org/zh-TW/docs/Web/HTTP/Guides/Overview) | 繁中 | 入門 | 20 分 |
| [MDN：HTTP 請求方法](https://developer.mozilla.org/zh-TW/docs/Web/HTTP/Reference/Methods) | 繁中 | 入門 | 10 分 |

## 相關頁面

[HTTP 狀態碼](08-HTTP狀態碼.md)　[JSON](09-JSON.md)　[REST API 設計](10-REST-API設計.md)　[CORS 跨來源問題](11-CORS跨來源.md)
