# Northwind 範例：Axios + TanStack Query 實作

**難度** ★★★☆☆　**用在哪些模組** 所有前端工作　**哪幾週** 第 2 週起

## 一句話

拿後端現成的 **Northwind 商品 API** 當練習場，同一組 RESTful 操作寫兩次：一次只用 [Axios](51-Axios.md)，一次用 [TanStack Query](52-TanStackQuery.md)，對照看兩種寫法差在哪。

專題自己的 API 還沒好之前，先用這組練熟；寫法跟之後串 smartorder 的 API 完全一樣。

## 先跑起來

1. 後端照 README 準備好 `smartorder`、`northwind` 兩個資料庫並啟動（Northwind 只給 demo 用）
2. 前端 `npm run dev`
3. 開 **`http://localhost:5173/demo`**，有兩個範例頁：

| 頁面 | 網址 | 資料怎麼拿 |
|---|---|---|
| 純 Axios | `/demo/northwind/axios` | `useState` + `useEffect` 直接呼叫 API 函式 |
| TanStack Query | `/demo/northwind/tanstack` | `useQuery`／`useMutation` |

兩頁畫面一模一樣：新增（POST）、分頁清單（GET）、點一列看明細（GET 一筆）並整筆修改（PUT）、勾「上架」（PATCH）、刪除（DELETE）。

對照的檔案：

```
src/
├── services/
│   ├── client/demoClient.ts        ← demo 專用的 Axios client，不帶任何 token
│   └── api/northwind/              ← 純 Axios 的 RESTful 範例
│       ├── types.ts                   型別
│       ├── productApi.ts              商品：GET 清單、GET 一筆、POST、PUT、PATCH、DELETE
│       └── categoryApi.ts             分類：GET 清單
├── hooks/northwind/                ← TanStack Query 的 RESTful 範例
│   ├── northwindKeys.ts               queryKey
│   ├── useProductQueries.ts           useProducts、useProduct
│   ├── useProductMutations.ts         useCreateProduct、useUpdateProduct、usePatchProduct、useDeleteProduct
│   └── useCategories.ts
└── features/demo/
    ├── DemoIndex.tsx               ← /demo 入口頁
    └── northwind/
        ├── AxiosRestDemo.tsx          純 Axios 版頁面
        ├── TanStackRestDemo.tsx       TanStack Query 版頁面
        └── ProductForm.tsx、ProductTable.tsx、ProductDetail.tsx   兩頁共用的畫面
```

## 後端提供什麼

| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/api/northwind/products?page=0&size=10&sort=id` | 分頁查商品，回 `{ items, page, size, totalElements }` |
| GET | `/api/northwind/products/{id}` | 查一筆 |
| POST | `/api/northwind/products` | 新增，成功回 `201` 和新商品 |
| PUT | `/api/northwind/products/{id}` | 整筆取代（所有欄位都要給） |
| PATCH | `/api/northwind/products/{id}` | 只改有給的欄位 |
| DELETE | `/api/northwind/products/{id}` | 刪除，成功回 `204` |
| GET | `/api/northwind/categories` | 分類清單 |

錯誤時回 `{ status, message, path, timestamp }`，例如 `400`「unitPrice 不可小於 0」、`404`「找不到商品：99999」、`409`「資料目前被其他資料引用」。

## 第一部分：純 Axios

### 每個 REST 操作一個函式

```ts
// src/services/api/northwind/productApi.ts
const PRODUCTS = '/northwind/products'

export async function fetchProducts({ page, size }: ProductPageParams, signal?: AbortSignal) {
  const { data } = await demoClient.get<ProductPage>(PRODUCTS, {
    params: { page, size, sort: 'id' },
    signal,
  })
  return data
}

export async function fetchProduct(id: number, signal?: AbortSignal) {
  const { data } = await demoClient.get<Product>(`${PRODUCTS}/${id}`, { signal })
  return data
}

export async function createProduct(body: ProductInput) {
  const { data } = await demoClient.post<Product>(PRODUCTS, body)
  return data
}

export async function updateProduct(id: number, body: ProductInput) {
  const { data } = await demoClient.put<Product>(`${PRODUCTS}/${id}`, body)
  return data
}

export async function patchProduct(id: number, body: ProductPatch) {
  const { data } = await demoClient.patch<Product>(`${PRODUCTS}/${id}`, body)
  return data
}

export async function deleteProduct(id: number) {
  await demoClient.delete(`${PRODUCTS}/${id}`)
}
```

- 查詢參數用 `params`，Axios 會幫你組成 `?page=0&size=10&sort=id`
- `signal` 讓呼叫的人可以中途取消請求（例如快速切頁、元件已經消失）
- **PUT 和 PATCH 的差別**：PUT 的 body 是 `ProductInput`（全部欄位），PATCH 是 `ProductPatch`（全部欄位都變成可選）

**動手試**：開範例頁，F12 → Console：

```js
const { fetchProduct } = await import('/src/services/api/northwind/productApi.ts')
await fetchProduct(1)                                  // { id: 1, productName: 'Chai', … }
await fetchProduct(99999).catch((error) => error)      // ApiError：status 404、message「找不到商品：99999」
```

### 在頁面裡用 useState + useEffect 接起來

```tsx
// src/features/demo/northwind/AxiosRestDemo.tsx（節錄）
const [page, setPage] = useState(0)
const [reloadKey, setReloadKey] = useState(0)
const [list, setList] = useState<ProductPage | null>(null)
const [isListLoading, setIsListLoading] = useState(true)
const [listError, setListError] = useState<string>()

useEffect(() => {
  const controller = new AbortController()
  setIsListLoading(true)
  setListError(undefined)

  fetchProducts({ page, size: PAGE_SIZE }, controller.signal)
    .then(setList)
    .catch((error: unknown) => {
      if (!controller.signal.aborted) setListError(messageOf(error))
    })
    .finally(() => {
      if (!controller.signal.aborted) setIsListLoading(false)
    })

  return () => controller.abort()
}, [page, reloadKey])

const reload = () => setReloadKey((key) => key + 1)

async function handleCreate(body: ProductInput) {
  setSubmitting('create')
  try {
    const product = await createProduct(body)
    setCreateResult({ ok: true, message: `已新增「${product.productName}」（#${product.id}）` })
    reload()
  } catch (error) {
    setCreateResult({ ok: false, message: messageOf(error) })
  } finally {
    setSubmitting(null)
  }
}
```

這一版**所有事情都要自己做**：

- 每份資料都要三個 state：資料、載入中、錯誤
- `useEffect` 要自己建 `AbortController`，元件消失或換頁時取消舊請求，否則晚回來的舊資料會蓋掉新的
- 新增、修改、刪除完要**自己記得呼叫 `reload()`**，忘了畫面就不會更新
- 換頁時資料會先清掉、閃回「載入中」，切回看過的頁也會再打一次

## 第二部分：TanStack Query

同一組 API 函式，包成 hooks。

### 查詢：useProducts、useProduct

```ts
// src/hooks/northwind/northwindKeys.ts
export const northwindKeys = {
  all: [...queryScope.demo, 'northwind'] as const,
  productLists: () => [...northwindKeys.all, 'products'] as const,
  products: (params: ProductPageParams) => [...northwindKeys.productLists(), params] as const,
  product: (id: number) => [...northwindKeys.all, 'product', id] as const,
  categories: () => [...northwindKeys.all, 'categories'] as const,
}
```

```ts
// src/hooks/northwind/useProductQueries.ts
export function useProducts(params: ProductPageParams) {
  return useQuery({
    queryKey: northwindKeys.products(params),
    queryFn: ({ signal }) => fetchProducts(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useProduct(id: number | null) {
  return useQuery({
    queryKey: northwindKeys.product(id ?? 0),
    queryFn: ({ signal }) => fetchProduct(id ?? 0, signal),
    enabled: id !== null,
  })
}
```

- **`page` 放進 `queryKey`**：換頁就是換一份資料，切回看過的頁直接用快取
- **`keepPreviousData`**：換頁時先留著上一頁，新資料到了才換，畫面不會閃回「載入中」
- **`isPlaceholderData`**：正在顯示上一頁的舊資料時是 `true`，範例頁拿它擋「下一頁」連點
- **`enabled: id !== null`**：還沒選商品時不打 API
- `signal` 由 TanStack Query 自己傳進來，取消請求不用自己寫

分類幾乎不會變，`useCategories` 設 `staleTime: Infinity`，整個 App 只打一次；新增表單的下拉選單和清單的分類名稱用的是同一份快取。

### 新增與整筆修改：useCreateProduct、useUpdateProduct

```ts
// src/hooks/northwind/useProductMutations.ts
export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: northwindKeys.productLists() }),
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ProductInput }) => updateProduct(id, body),
    onSuccess: (product) => {
      queryClient.setQueryData(northwindKeys.product(product.id), product)
      return queryClient.invalidateQueries({ queryKey: northwindKeys.productLists() })
    },
  })
}
```

- **新增成功後 `invalidateQueries`**：所有分頁的清單都過期，畫面上那一頁自動重抓，總筆數跟著變
- **PUT 成功後 `setQueryData`**：後端回的就是最新的那一筆，直接放進單筆快取，明細不用再打一次 GET
- 頁面只要 `create.mutate(body)`，`create.isPending` 擋重複送出、`create.error.message` 顯示錯誤

### 部分修改：樂觀更新（Optimistic Update）

勾「上架」時不等後端，畫面先變；失敗了再變回來：

```ts
export function usePatchProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ProductPatch }) => patchProduct(id, body),
    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: northwindKeys.productLists() })
      const snapshots = queryClient.getQueriesData<ProductPage>({ queryKey: northwindKeys.productLists() })

      queryClient.setQueriesData<ProductPage>({ queryKey: northwindKeys.productLists() }, (page) =>
        page && {
          ...page,
          items: page.items.map((product) => (product.id === id ? { ...product, ...body } : product)),
        },
      )

      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, page]) => queryClient.setQueryData(queryKey, page))
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: northwindKeys.product(id) })
      return queryClient.invalidateQueries({ queryKey: northwindKeys.productLists() })
    },
  })
}
```

四個步驟：

1. **`cancelQueries`**：正在跑的重抓先取消，免得舊資料晚回來蓋掉你剛改的
2. **存快照、改快取**：`onMutate` 回傳的東西會變成後面的 `context`
3. **失敗就還原**：`onError` 把快照放回去
4. **不管成功失敗都重抓**：`onSettled` 讓畫面跟後端對齊

> 樂觀更新適合「幾乎不會失敗、使用者很在意速度」的操作，例如切換開關。**送出點餐、結帳不要用**——錢跟庫存的事，等後端說成功才算數。

純 Axios 版勾「上架」會等後端回來、重抓清單之後才看到變化；TanStack Query 版一按就變。兩頁都開著比比看。

### 刪除：useDeleteProduct

```ts
export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: northwindKeys.product(id) })
      return queryClient.invalidateQueries({ queryKey: northwindKeys.productLists() })
    },
  })
}
```

刪掉的那一筆單筆快取直接移除，清單重抓。

Northwind 原本的商品大多被訂單引用，**刪除會回 `409`「資料目前被其他資料引用」**。練習時自己新增一筆再刪，會成功；刪原本的，會看到錯誤訊息。

## 兩種寫法對照

| | 純 Axios | TanStack Query |
|---|---|---|
| 載入中、錯誤 | 每份資料自己開 state | `isPending`、`isError`、`error` |
| 取消舊請求 | 自己建 `AbortController` | 自動 |
| 寫入後更新畫面 | 自己記得 `reload()` | hook 裡 `invalidateQueries` 一次寫好 |
| 切回看過的頁 | 再打一次 | 用快取 |
| 換頁時 | 閃回載入中 | `keepPreviousData` 留著上一頁 |
| 勾選上架 | 等後端回來才變 | 樂觀更新，一按就變 |
| 頁面程式碼 | 多 | 少 |

**專題的頁面一律用 TanStack Query 的寫法**；純 Axios 版是讓你看懂 TanStack Query 幫你省掉了什麼。

## 你會遇到的坑

**① 中文商品名稱存不進去，回 500**
本機 Northwind 的資料表如果是舊的 `latin1` 字元集，中文會被 MySQL 拒絕。這是資料庫設定，不是前端的錯；練習時用英文名稱，或請負責資料庫的人把表改成 `utf8mb4`。

**② 純 Axios 版換頁後清單顯示錯頁的資料**
`useEffect` 沒有在清理函式 `abort()`，舊請求比新請求晚回來就蓋掉了。

**③ 新增後清單沒更新**
純 Axios 版忘了 `reload()`；TanStack Query 版忘了 `invalidateQueries`，或 key 的前綴對不上。→ 用 `northwindKeys` 產生 key，不要手打陣列。

**④ CORS 錯誤**
後端只放行 `http://localhost:5173`。前端開在別的埠或用手機連區網 IP，要在後端 `.env` 設 `CORS_ALLOWED_ORIGINS`。

**⑤ 打到 `/api/products` 回 403**
Northwind 的 API 已經改到 `/api/northwind/**`。

## 自我檢核

1. PUT 和 PATCH 的 body 型別為什麼不一樣？
2. 純 Axios 版的 `useEffect` 為什麼要 `abort()`？TanStack Query 版為什麼不用？
3. `invalidateQueries` 和 `setQueryData` 各在什麼時候用？
4. 樂觀更新的四個步驟是什麼？為什麼送出點餐不適合？
5. Northwind 為什麼要用 `demoClient`，而不是 `customerClient`？

## 相關頁面

[Axios 串接後端 API](51-Axios.md)　[TanStack Query](52-TanStackQuery.md)　[useEffect](37-useEffect.md)　[CORS 跨來源問題](../web/11-CORS跨來源.md)
