import { employeeClient } from '@/services/client/employeeClient'

export type TableOrderItem = {
  id: number | string
  name: string
  quantity: number
  status: string
  note?: string | null
}

export type TableOrder = {
  id: number | string
  sequenceNo: number
  status: string
  time: string
  total: number | string
  items: TableOrderItem[]
}

export type TableDetail = {
  tableInfo: string
  diningStatus: string
  seatedTime: string
  diningMinutes: number
  orders: TableOrder[]
  subtotal: number | string
  serviceFee: number | string
  total: number | string
  adultCount: number
  childCount: number
}

// 取得桌位詳細資料
export async function getTableDetail(tableNumber: string) {
  const { data } = await employeeClient.get<TableDetail>(
    `/tables/${encodeURIComponent(tableNumber)}/detail`,
  )
  return data
}

// 模擬結帳
export async function checkoutTable(
  tableNumber: string,
  paymentMethod: string,
) {
  const methodMap: Record<string, string> = {
    cash: 'CASH',
    credit: 'CARD',
    barcode: 'BARCODE',
  }

  const method = methodMap[paymentMethod]

  if (!method) {
    throw new Error('不支援的付款方式')
  }

  const { data } = await employeeClient.post<unknown>(
    `/tables/${encodeURIComponent(tableNumber)}/checkout`,
    { paymentMethod: method },
  )
  return data
}
// 後端 TableOverviewResponse 回來的一張桌子
export type TableOverview = {
  tableId: number
  tableNo: string
  seats: number
  area: string
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING'
  displayStatus: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'RESERVED'
  adultCount: number | null
  childCount: number | null
  openedAt: string | null
}

// GET /api/admin/tables：S-02 桌況總覽
export async function fetchTables(signal?: AbortSignal) {
  const { data } = await employeeClient.get<TableOverview[]>('/admin/tables', { signal })
  return data
}

// POST /api/admin/tables/{id}/clean：清潔完成 → 空桌
export async function cleanTable(tableId: number) {
  await employeeClient.post(`/admin/tables/${tableId}/clean`)
}

// POST /api/admin/tables/{id}/open：現場開桌
export async function openTable(tableId: number, adultCount: number, childCount: number) {
  const { data } = await employeeClient.post<TableOverview>(`/admin/tables/${tableId}/open`, {
    adultCount,
    childCount,
  })
  return data
}
