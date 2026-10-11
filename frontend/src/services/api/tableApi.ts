import { employeeClient } from '@/services/client/employeeClient'

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