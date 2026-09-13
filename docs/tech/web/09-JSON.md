# JSON

**難度** ★☆☆☆☆　**用在哪些模組** 全員　**哪幾週** 第 0 週

## 一句話

JSON 是**前端和後端講話時用的共同語言**，長得像一張有格式的清單。

## 想像一下

前端是用 JavaScript 寫的，後端是用 Java 寫的。兩種不同的語言，怎麼交換資料？

就像一個講中文、一個講日文，中間需要一種**兩邊都看得懂的寫法**。JSON 就是那個共同語言。

它長這樣：

```json
{
  "name": "美國牛五花",
  "price": 280,
  "soldOut": false,
  "tags": ["肉品", "人氣"],
  "category": {
    "id": 2,
    "name": "肉品"
  }
}
```

看起來就像一張整齊的清單：**每個東西有一個名字，後面接著它的值。**

## 只有六種值

| 型別 | 長什麼樣 | 注意 |
|---|---|---|
| 文字 | `"美國牛五花"` | **一定要用雙引號**，不能用單引號 |
| 數字 | `280` 或 `280.50` | 不加引號 |
| 真假 | `true` / `false` | 小寫，不加引號 |
| 沒有值 | `null` | 小寫 |
| 一串東西 | `["肉品", "人氣"]` | 用中括號 |
| 巢狀的物件 | `{ "id": 2 }` | 用大括號，裡面可以再包 |

## 三條會害你的規則

**① 只能用雙引號**

```json
{ 'name': '牛五花' }   ❌ 單引號不行
{ "name": "牛五花" }   ✅
```

**② 最後一項後面不能有逗號**

```json
{ "a": 1, "b": 2, }    ❌ 多了一個逗號
{ "a": 1, "b": 2 }     ✅
```

這是新手最常犯的錯，因為 JavaScript 允許但 JSON 不允許。

**③ 不能寫註解**

```json
{ "price": 280 }  // 這是價格   ❌ JSON 沒有註解
```

## 在我們的專案裡

前端送出點餐：

```json
{
  "items": [
    { "menuItemId": 12, "quantity": 2, "optionValueIds": [12, 41], "note": "不要太熟" },
    { "menuItemId": 31, "quantity": 1, "optionValueIds": [] }
  ]
}
```

後端回應：

```json
{
  "ticketId": 3301,
  "sequenceNo": 2,
  "status": "PENDING",
  "items": [
    { "id": 8801, "name": "美國牛五花", "quantity": 2, "lineTotal": 740.00 }
  ]
}
```

**我們的命名規定**：一律用 `camelCase`（第一個字小寫，後面每個字第一個字母大寫），像 `menuItemId`、`orderTicket`。不要 `menu_item_id`，那是資料庫的寫法。

## 前後端怎麼轉換

好消息是：**你幾乎不用手動處理。**

| 端 | 怎麼轉 |
|---|---|
| **後端 Java** | Spring Boot 自動把 Java 物件變成 JSON，也自動把收到的 JSON 變成 Java 物件。你只要定義好 [DTO](../backend/17-Entity與DTO.md) |
| **前端 JS** | `JSON.parse(文字)` 變成物件，`JSON.stringify(物件)` 變成文字。用 `fetch` 的話連這個都幫你做好了 |

## 15 分鐘動手小練習

1. 打開 [JSONLint](https://jsonlint.com/)（線上 JSON 檢查器）
2. 貼上這段**故意寫錯的** JSON，看它怎麼罵你：

```json
{
  'name': "牛五花",
  "price": 280,
}
```

3. 把兩個錯誤改對，看到綠色的 Valid JSON
4. 回到瀏覽器 F12 → Network → 找一個 API 請求 → Response 分頁，那就是真實的 JSON

## 你會遇到的坑

**① 多了一個逗號**
後端會噴 `JSON parse error`。仔細看最後一項。

**② 數字被當成文字**
`"price": "280"` 和 `"price": 280` 不一樣。前者後端可能會轉型失敗。

**③ 日期沒有標準格式**
JSON 沒有「日期」這種型別，日期一定是文字。我們統一用 `"2026-09-13T18:30:00+08:00"` 這種格式。

**④ 金額用小數會出怪事**
`0.1 + 0.2` 在電腦裡不等於 `0.3`。後端算錢一律用 `BigDecimal`，不要用 `double`。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `Unexpected token } in JSON` | 格式壞了 | 多半是多了逗號，貼到 JSONLint 檢查 |
| `JSON parse error: Cannot deserialize value` | 型別對不上 | 後端期待數字你給了文字，或反過來 |
| `Unrecognized field "xxx"` | 後端不認識這個欄位 | 欄位名稱打錯，或 DTO 沒定義 |
| `Required request body is missing` | 你沒送 body | POST 忘了帶內容 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 共同語言 | JSON（JavaScript Object Notation） |
| 文字變成物件 | 解析 / parse / 反序列化 deserialize |
| 物件變成文字 | 序列化 serialize / stringify |
| 名字後面接值 | key-value pair 鍵值對 |

## 自我檢核

1. JSON 的文字可以用單引號嗎？
2. 最後一項後面可以加逗號嗎？
3. 我們專案的欄位命名用哪種寫法？
4. 為什麼算錢不能用小數（double）？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [MDN：使用 JSON](https://developer.mozilla.org/zh-TW/docs/Learn_web_development/Core/Scripting/JSON) | 繁中 | 入門 | 20 分 |
| [JSONLint 線上檢查器](https://jsonlint.com/) | 工具 | — | 隨時用 |

## 相關頁面

[HTTP 請求與回應](07-HTTP請求與回應.md)　[Entity 與 DTO](../backend/17-Entity與DTO.md)　[fetch 串接後端 API](../frontend/40-fetch串接API.md)
