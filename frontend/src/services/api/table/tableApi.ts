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
  tableNumber: string
  sessionId: number | string
  sessionStatus: 'OPEN' | 'PAID' | 'CANCELLED' | string
  hasOrderHistory: boolean
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

export type SettlementMethod = 'CASH' | 'CARD' | 'BARCODE'

export type SettlementResponse = {
  sessionId: number | string
  status: 'PAID'
  method: SettlementMethod
  total: number | string
  tableNo: string
  tableStatus: 'CLEANING'
  closedAt: string
}

export type CancelSessionResponse = {
  sessionId: number | string
  status: 'CANCELLED'
  tableStatus: 'AVAILABLE'
}

// 櫃檯使用精確用餐場次的帳單資料，避免桌號重用時誤關新場次。
export async function getTableDetail(tableNumber: string, signal?: AbortSignal) {
  const { data } = await employeeClient.get<TableDetail>(
    `/admin/tables/${encodeURIComponent(tableNumber)}/detail`,
    { signal },
  )
  return data
}

// 以精確場次重抓同一份帳單，不依桌號改查後續新場次。
export async function getDiningSessionDetail(sessionId: number | string, signal?: AbortSignal) {
  const { data } = await employeeClient.get<TableDetail>(
    `/admin/dining-sessions/${encodeURIComponent(String(sessionId))}`,
    { signal },
  )
  return data
}

export async function settleDiningSession(
  sessionId: number | string,
  method: SettlementMethod,
  expectedTotal: number | string,
) {
  const { data } = await employeeClient.post<SettlementResponse>(
    `/admin/dining-sessions/${encodeURIComponent(String(sessionId))}/settle`,
    { method, expectedTotal },
  )
  return data
}

export async function cancelDiningSession(sessionId: number | string) {
  const { data } = await employeeClient.post<CancelSessionResponse>(
    `/admin/dining-sessions/${encodeURIComponent(String(sessionId))}/cancel`,
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
