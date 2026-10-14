import { employeeClient } from '@/services/client/employeeClient'

// 後端 SeatResponse 回來的一筆桌位
export type Seat = {
  id: number
  tableNo: string
  seats: number
  area: string
  reservable: boolean
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING'
}

// GET /api/admin/tables-config：取得所有桌位
export async function fetchSeats(signal?: AbortSignal) {
  const { data } = await employeeClient.get<Seat[]>('/admin/tables-config', { signal })
  return data
}