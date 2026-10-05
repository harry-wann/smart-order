# TanStack Query 管理後端資料

**難度** ★★★☆☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 2 週起

## 一句話

TanStack Query（舊名 React Query）幫你處理「**跟後端拿資料**」這件事的所有麻煩：載入中、錯誤、快取、重抓、送出後更新畫面。

它**不負責打 API**——打 API 還是 [Axios](51-Axios.md)。它負責的是「什麼時候打、打完的結果放哪、誰要用」。

## 沒有它的時候

[fetch 那頁](40-fetch串接API.md) 的標準寫法：

```jsx
const [items, setItems] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

useEffect(() => {
  setLoading(true)
  fetchMenuItems(2)
    .then(setItems)
    .catch(setError)
    .finally(() => setLoading(false))
}, [])
```

每個頁面都要寫一次，而且還沒處理：

- 切到別頁再切回來，又重抓一次
- 兩個元件要同一份資料，各抓各的
- 元件已經消失資料才回來
- 加入購物車後，別的元件裡的購物車不會更新

## 最小的例子

```tsx
import { useQuery } from '@tanstack/react-query'
import { fetchMenuItems } from '@/services/api/menu'

function MenuList({ categoryId }: Props) {
  const { data: items, isPending, isError, error, refetch } = useQuery({
    queryKey: ['customer', 'menu', categoryId],
    queryFn: () => fetchMenuItems(categoryId),
  })

  if (isPending) return <Skeleton />
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />
  if (items.length === 0) return <EmptyState text="這個分類還沒有品項" />

  return <ItemList items={items} />
}
```

**三態（載入中／錯誤／空資料）一樣要處理**，只是不用自己寫三個 `useState`。

## 兩個核心概念

**① `queryKey`：這份資料的名字**

同一個 `queryKey` 就是同一份資料。兩個元件都用 `['customer', 'cart']`，只會打一次 API、兩邊拿到同一份。

`categoryId` 放進 key 裡，換分類時就會自動打新的請求，切回來時直接拿快取。

**② `useMutation`：會改資料的動作**

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addCartItem } from '@/services/api/cart'

function AddToCartButton({ body }: Props) {
  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: addCartItem,
    onSuccess: (cart) => queryClient.setQueryData(['customer', 'session', 'cart'], cart),
    onError: (error) => showToast({ text: error.message }),
  })

  return <SOButton text="加入購物車" disabled={isPending} onClick={() => mutate(body)} />
}
```

- `isPending` 直接拿來擋重複送出
- 成功後用 `setQueryData` 把後端回的最新購物車放進快取，所有用到購物車的元件會一起更新
- 後端沒回完整資料時，改用 `queryClient.invalidateQueries({ queryKey: [...] })` 叫它重抓

## 我們專案的規則

### 共用設定已經寫好

`src/services/client/queryClient.ts` 已經在 `main.jsx` 用 `QueryClientProvider` 包住整個 App，頁面直接用 `useQuery`／`useMutation` 就好：

| 設定 | 值 | 為什麼 |
|---|---|---|
| `staleTime` | 30 秒 | 30 秒內切回來直接用快取，不重抓 |
| `refetchOnWindowFocus` | 關 | 即時資料靠 WebSocket 推，不靠切視窗重抓 |
| `retry` | 4xx 不重試，其他最多 2 次 | 401、409 重試也不會成功；連線失敗才值得再試 |
| mutation `retry` | 不重試 | 送出點餐重試可能變成兩張單 |

`error` 的型別已經設成 [`ApiError`](51-Axios.md)，可以直接拿 `error.code`、`error.message`。
但 `queryFn` 自己寫錯丟出的一般錯誤（例如資料形狀不對的 `TypeError`）不會是 `ApiError`，要判斷 `code` 時請用 `isApiError(error, 'CART_EMPTY')`。

### queryKey 第一層一定是身分

**顧客和員工的資料要分開快取**，跟 token 分開是同一個道理：

| 第一層 | 第二層 | 例子 | 什麼時候被清掉 |
|---|---|---|---|
| `'customer'` | 公開資料 | `['customer', 'menu', 2]` | 不會 |
| `'customer'` | `'session'` | `['customer', 'session', 'cart']` | 加入／離開桌位（`joinTable`、`leaveTable`） |
| `'customer'` | `'member'` | `['customer', 'member', 'reservations']` | 會員登入／登出（`signInMember`、`signOutMember`） |
| `'employee'` | 任意 | `['employee', 'tables']` | 員工登入／登出（`signInEmployee`、`signOutEmployee`） |

`auth.ts` 的登入登出函式會順便清掉對應的快取，所以換人登入不會看到上一個人的資料。前綴請用 `queryScope`，不要手打：

```ts
import { queryScope } from '@/services/client/queryClient'

queryKey: [...queryScope.employee, 'tables']
queryKey: [...queryScope.customerMember, 'reservations']
```

### 檔案放哪裡

- **打 API 的函式**放 `src/services/api/xxx.ts`（見 [Axios](51-Axios.md)）
- **包成 hook** 放 `src/hooks/useXxx.ts`，頁面只呼叫 hook

```ts
// src/hooks/useAdminTables.ts
import { useQuery } from '@tanstack/react-query'
import { fetchTables } from '@/services/api/adminTables'
import { queryScope } from '@/services/client/queryClient'

export const adminTablesKey = [...queryScope.employee, 'tables']

function useAdminTables() {
  return useQuery({ queryKey: adminTablesKey, queryFn: fetchTables })
}

export default useAdminTables
```

### 跟 WebSocket 一起用

後端推來的資料（同桌購物車更新、桌況變化）**直接寫進快取**，不要另外存一份 `useState`：

```ts
socket.subscribe('/topic/sessions/1052', (message) => {
  const event = JSON.parse(message.body)
  if (event.type === 'CART_UPDATED') {
    queryClient.setQueryData([...queryScope.customerSession, 'cart'], event.payload)
  }
})
```

推來的只是通知、沒帶資料的話，用 `invalidateQueries` 叫它重抓。WebSocket 本身的寫法見 [前端接 WebSocket](../realtime/42-前端接WebSocket.md)。

## 15 分鐘動手小練習

在 `src/features/components-demo/` 開一個練習頁（練完刪掉），打一個公開的 API：

```tsx
import { useQuery } from '@tanstack/react-query'

function Practice() {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['practice', 'octocat'],
    queryFn: () => fetch('https://api.github.com/users/octocat').then((res) => res.json()),
  })

  if (isPending) return <p>載入中…</p>
  if (isError) return <p>{error.message}</p>

  return (
    <div>
      <p>{data.name}</p>
      <button onClick={() => refetch()}>{isFetching ? '重抓中…' : '重抓'}</button>
    </div>
  )
}
```

1. 開頁面，F12 → Network 看到一次請求
2. 切到別頁再 30 秒內切回來，**Network 沒有新請求**——這就是快取
3. 按「重抓」，`isPending` 不會變回 true，只有 `isFetching` 變 true：畫面不會閃回載入中

## 你會遇到的坑

**① 把 `useQuery` 的結果再 `setState` 一份**
兩份資料會不同步。→ 直接用 `data`，要加工就在 render 時算。

**② `queryKey` 少放了參數**
換分類還是顯示舊的。→ 函式用到的參數都要放進 key。

**③ queryKey 沒有身分前綴**
員工登出後，下一個人看到上一個人的資料。→ 一律用 `queryScope`。

**④ 送出成功後沒有更新快取**
購物車角標還是舊的數字。→ `setQueryData` 或 `invalidateQueries`。

**⑤ 在 mutation 外面自己 `try/catch` 又在 `onError` 處理一次**
toast 跳兩次。→ 選一個地方處理。

**⑥ `isPending` 和 `isFetching` 搞混**
`isPending` 是「還沒有任何資料」，`isFetching` 是「正在打 API」（包含背景重抓）。骨架畫面看 `isPending`。

## 常見錯誤訊息對照

| 你會看到 | 中文意思 | 怎麼修 |
|---|---|---|
| `No QueryClient set, use QueryClientProvider to set one` | 外面沒有 Provider | 元件要在 `main.jsx` 的 `QueryClientProvider` 底下 |
| `Query data cannot be undefined` | `queryFn` 沒有 `return` | 函式要回傳資料（沒資料就回 `null`） |
| 畫面一直是載入中 | `queryFn` 一直沒結束，或 `enabled: false` | 看 Network、檢查 `enabled` |
| 資料沒更新 | 還在 `staleTime` 內 | 送出後要 `invalidateQueries` |

## 術語對照表

| 白話 | 正式名稱 |
|---|---|
| 一份資料的名字 | query key |
| 去拿資料的函式 | query function |
| 會改資料的動作 | mutation |
| 叫它重抓 | invalidate |
| 多久內不算舊 | `staleTime` |
| 存著的上一次結果 | cache（快取） |

## 自我檢核

1. 兩個元件用同一個 `queryKey`，會打幾次 API？
2. 為什麼 `queryKey` 第一層要分 `customer`／`employee`？
3. 加入購物車成功後，要怎麼讓購物車角標跟著更新？
4. `isPending` 和 `isFetching` 差在哪？

## 學習資源

| 資源 | 語言 | 難度 | 時間 |
|---|---|---|---|
| [TanStack Query 官方：Overview](https://tanstack.com/query/latest/docs/framework/react/overview) | 英文 | 入門 | 15 分 |
| [TanStack Query 官方：Quick Start](https://tanstack.com/query/latest/docs/framework/react/quick-start) | 英文 | 入門 | 15 分 |
| [TanStack Query 官方：Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) | 英文 | 入門 | 10 分 |

## 相關頁面

[Northwind 範例](53-Northwind範例.md)　[Axios 串接後端 API](51-Axios.md)　[fetch 串接後端 API](40-fetch串接API.md)　[useEffect](37-useEffect.md)　[前端接 WebSocket](../realtime/42-前端接WebSocket.md)
