# Axios 串接後端 API

**難度** ★★☆☆☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 1 週起

## 一句話

Axios 是 `fetch` 的加強版：**錯誤會自己丟出來、JSON 自己轉、每個請求要加的標頭寫一次就好**。

先讀過 [fetch 串接後端 API](40-fetch串接API.md) 再來看這頁，會比較知道 Axios 幫你省掉了什麼。

## 最小的例子

```ts
import axios from 'axios'

const { data } = await axios.get('http://localhost:8080/api/menu/items')
console.log(data)
```

跟 `fetch` 比：

| | `fetch` | Axios |
|---|---|---|
| 拿到資料 | 兩個 `await`（`res.json()`） | 一個 `await`，資料在 `data` |
| 4xx / 5xx | **不會**丟錯誤，要自己看 `res.ok` | **會**丟錯誤，直接進 `catch` |
| 送 JSON | 自己 `JSON.stringify`、自己設 `Content-Type` | 直接傳物件 |
| 每個請求都要帶的標頭 | 每次自己加 | 寫在攔截器（interceptor），一次搞定 |
| 逾時 | 要自己用 `AbortController` | `timeout: 15000` |

```ts
// 加一份牛五花到購物車
await axios.post('/api/dining-sessions/me/cart/items', {
  menuItemId: 12,
  quantity: 1,
  optionValueIds: [],
  note: '',
})
```

## 三個你會用到的東西

**① instance：把共同設定包起來**

```ts
const client = axios.create({ baseURL: 'http://localhost:8080/api', timeout: 15_000 })

await client.get('/menu/items')     // 實際打 http://localhost:8080/api/menu/items
```

**② 請求攔截器：每次送出前都會經過**

```ts
client.interceptors.request.use((config) => {
  config.headers.set('X-Device-Id', getDeviceId())
  return config
})
```

**③ 回應攔截器：每次出錯都會經過**

```ts
client.interceptors.response.use(undefined, (error) => {
  // 這裡統一把錯誤整理成同一種格式
  return Promise.reject(toApiError(error))
})
```

## 我們專案的共用層

**元件裡不准直接出現 `axios`。** 共用的 client 放在 `src/services/client/`，各模組的 API 放在 `src/services/api/`：

```
src/services/
├── client/                 ← 共用層，寫好之後很少需要動
│   ├── tokenStore.ts       ← 所有 token 存取都在這裡，分成 customer 和 employee 兩組
│   ├── ApiError.ts         ← 統一的錯誤格式
│   ├── createApiClient.ts  ← 共用設定（baseURL、逾時、錯誤轉換）
│   ├── customerClient.ts   ← 顧客端用的 client
│   ├── employeeClient.ts   ← 店家端用的 client
│   ├── demoClient.ts       ← Northwind 練習用的 client，不帶 token（見 53-Northwind範例）
│   ├── queryClient.ts      ← TanStack Query 的設定，見下一頁
│   └── auth.ts             ← 登入、登出、加入桌位時存清 token
│
└── api/                    ← 只放打 API 的函式，各模組一個檔，頁面只呼叫這一層
    └── menu.ts、cart.ts、northwind/…
```

### 為什麼有兩個 client

顧客和員工是**兩種完全不同的身分**，token 不能混用：

| | `customerClient` | `employeeClient` |
|---|---|---|
| 給誰用 | 顧客端頁面（`/`、`/order`、`/member`、`/reserve`） | 店家端頁面（`/admin/**`） |
| 會帶的標頭 | `X-Device-Id`，再加上這次請求指定的顧客憑證 | `Authorization: Bearer <員工 JWT>` |
| token 存在 | `customer.memberToken`、`customer.sessionToken`、`customer.reservationToken` | `employee.token` |
| 401 時 | 只清掉失效的那一個顧客 token（連同它的快取），**不跳頁**，由頁面決定怎麼處理 | 清掉員工 token 與快取，**直接回 `/admin/login`** |

**兩組 token 用不同的 key 存、由不同的 client 帶出去**，所以：

- 同一台電腦同時開顧客頁和店家頁也不會互相蓋掉
- 顧客端的請求**永遠不會**帶到員工 JWT，員工登出也不會把客人的用餐權杖清掉

> 舊的 `fetch` 寫法把會員和員工的 JWT 都存在同一個 `jwt` key，同一台機器先登員工再登會員就會互相覆蓋。這是改成兩個 client 的原因。

### 顧客端要帶哪個憑證

顧客端有三種憑證（[04-API 規格](../../spec/04-API規格.md) §1.4），每個請求用 `customerAuth` 指定要帶哪幾種：

| `customerAuth` | 帶的標頭 | 用在哪 |
|---|---|---|
| 不寫（預設 `['session']`） | `X-Session-Token` | 購物車、送出點餐、服務鈴、本桌訂單 |
| `['member']` | `Authorization: Bearer <會員 JWT>` | 會員中心、我的預約 |
| `['reservation']` | `X-Reservation-Token` | 匿名客人查看、取消自己的訂位 |
| `['session', 'member']` | 兩個都帶 | 進階 8.10「這次消費記到會員」 |
| `[]` | 都不帶 | 菜單、桌位狀態、訂位空位 |

`X-Device-Id` 不管怎麼設定都會帶，它只用來標示「誰加的」，不是身分驗證。

### 寫一支模組 API

```ts
// src/services/api/cart.ts
import { customerClient } from '@/services/client/customerClient'

export type CartItem = {
  id: number
  menuItemId: number
  name: string
  quantity: number
  addedBy: { guestId: number; displayName: string }
}

export type Cart = {
  items: CartItem[]
  totalQuantity: number
  subtotal: number
}

export type AddCartItemBody = {
  menuItemId: number
  quantity: number
  optionValueIds: number[]
  note: string
}

export async function fetchCart() {
  const { data } = await customerClient.get<Cart>('/dining-sessions/me/cart')
  return data
}

export async function addCartItem(body: AddCartItemBody) {
  const { data } = await customerClient.post<Cart>('/dining-sessions/me/cart/items', body)
  return data
}
```

```ts
// src/services/api/menu.ts
export async function fetchMenuItems(categoryId: number) {
  const { data } = await customerClient.get<MenuItem[]>('/menu/items', {
    params: { categoryId },
    customerAuth: [],
  })
  return data
}
```

```ts
// src/services/api/adminTables.ts
import { employeeClient } from '@/services/client/employeeClient'

export async function fetchTables() {
  const { data } = await employeeClient.get<AdminTable[]>('/admin/tables')
  return data
}
```

- 路徑不用寫 `/api`，`baseURL` 已經是 `.env` 的 `VITE_API_BASE`
- 查詢參數用 `params`，不要自己拼 `?categoryId=2`
- 回傳 `data` 就好，不要把整個 response 丟給頁面

### 登入、登出、加入桌位

**不要在頁面裡直接 `localStorage.setItem`。** 一律呼叫 `auth.ts`，它會同時清掉另一個身分的快取（見 [TanStack Query](52-TanStackQuery.md)）：

```ts
import { signInEmployee, signOutEmployee, signInMember, joinTable, saveReservationToken, clearReservationToken } from '@/services/client/auth'

signInEmployee(data.token)                // S-01 員工登入成功
signOutEmployee()                         // 員工登出

signInMember(data.token)                  // C-12b 驗證碼通過
joinTable(data.sessionToken)              // C-01 掃碼加入桌位
saveReservationToken(data.accessToken)    // C-16c 匿名訂位建立成功
clearReservationToken()                   // 匿名訂位取消或結束後
```

## 錯誤處理

所有錯誤都會變成 `ApiError`，頁面只要看 `code`：

```ts
import { isApiError } from '@/services/client/ApiError'

try {
  await submitCart()
} catch (error) {
  if (isApiError(error, 'CART_EMPTY')) {
    // 409：同桌另一個人剛好先送出了
  } else if (isApiError(error, 'ITEM_SOLD_OUT')) {
    markSoldOut(error.details)
  } else if (isApiError(error)) {
    showToast({ text: error.message })
  }
}
```

| 欄位 | 內容 |
|---|---|
| `status` | HTTP 狀態碼；連不上是 `0` |
| `code` | 後端的錯誤碼（`ITEM_SOLD_OUT`…）；連不上是 `NETWORK_ERROR`、逾時是 `TIMEOUT` |
| `message` | 可以直接顯示給使用者的中文 |
| `details` | 哪些欄位或品項出錯 |
| `reason` | 補充原因，例如 `SESSION_CLOSED` 的 `PAID`／`CANCELLED` |

401 的 token 清理在 client 裡已經做掉了，頁面只需要決定畫面怎麼走（例如 `INVALID_SESSION_TOKEN` 導回 `/`）。
只會清掉「這次真的送出去、而且現在還存著」的那一個 token：請求送出後才換成新 token 的話，舊請求的 401 不會把新的清掉。

原本的錯誤放在 `error.cause`，除錯時可以在 Console 展開來看。

## 15 分鐘動手小練習

開 dev server，在任一頁按 F12 → Console：

```js
const { customerClient } = await import('/src/services/client/customerClient.ts')
const { customerTokens } = await import('/src/services/client/tokenStore.ts')

customerTokens.session.set('test-session')

// 1. 看看帶了哪些標頭（後端沒開也沒關係，F12 → Network 看 Request Headers）
await customerClient.get('/dining-sessions/me/cart').catch((error) => console.log(error.code))

// 2. 換成會員憑證再送一次，比較兩次的 Request Headers
await customerClient.get('/members/me', { customerAuth: ['member'] }).catch((error) => console.log(error.code))

// 3. 後端沒開的話，error.code 會是 NETWORK_ERROR，status 是 0
localStorage.clear()
```

**第 1、2 步請一定要去 Network 分頁看一次標頭**，這是本頁最重要的認知。

## 你會遇到的坑

**① 在元件裡直接 `import axios`**
token 有的帶有的沒帶，401 也不會清。→ 一律用 `customerClient`／`employeeClient`。

**② 顧客頁用了 `employeeClient`（或反過來）**
帶錯身分，後端回 401，員工頁還會被踢回登入頁。→ `/admin` 開頭的頁面才用 `employeeClient`。

**③ 會員 API 忘了 `customerAuth: ['member']`**
預設只帶用餐權杖，後端收不到 JWT 回 401。

**④ 路徑多寫了 `/api`**
變成 `/api/api/menu/items`，404。

**⑤ 自己拼查詢字串**
中文、空白沒編碼。→ 用 `params`。

**⑥ 直接改 `localStorage` 存 token**
key 打錯就讀不到，也不會清快取。→ 用 `auth.ts`。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `code: 'NETWORK_ERROR'` | 根本連不上 | 後端沒開、`VITE_API_BASE` 錯、或 CORS |
| `code: 'TIMEOUT'` | 15 秒沒回應 | 後端卡住，看後端 log |
| `401` + `UNAUTHORIZED` | JWT 沒帶或過期 | 檢查 `customerAuth`；員工頁會自動回登入頁 |
| `401` + `INVALID_SESSION_TOKEN` | 用餐權杖失效 | 這桌已結帳或取消，導回 `/` |
| `404` 而且網址是 `/api/api/…` | 路徑多了 `/api` | 拿掉 |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 一個有預設設定的 axios | instance |
| 每次請求都會經過的關卡 | interceptor（攔截器） |
| 網址前面共同的那段 | `baseURL` |
| 網址 `?` 後面的參數 | query string／`params` |
| 用餐權杖、會員 JWT、訂位權杖 | 顧客憑證（customer credentials） |

## 自我檢核

1. Axios 遇到 404 會進 `catch` 嗎？`fetch` 呢？
2. 為什麼顧客和員工要分兩個 client？
3. 會員中心的 API 要怎麼讓它帶 JWT？
4. 員工 token 過期時會發生什麼事？客人的用餐權杖會不見嗎？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [Axios 官方文件（中文）](https://axios-http.com/zh/docs/intro) | 簡中 | 入門 | 20 分 |
| [Axios：攔截器](https://axios-http.com/zh/docs/interceptors) | 簡中 | 入門 | 10 分 |
| 我們的 [04-API 規格](../../spec/04-API規格.md) §1.4 認證方式 | 繁中 | 入門 | 10 分 |

## 相關頁面

[Northwind 範例](53-Northwind範例.md)　[fetch 串接後端 API](40-fetch串接API.md)　[TanStack Query](52-TanStackQuery.md)　[非同步與 async/await](31-非同步與async.md)　[JWT 與登入狀態](../backend/21-JWT.md)　[CORS 跨來源問題](../web/11-CORS跨來源.md)
