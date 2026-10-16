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

// PATCH /api/admin/tables-config/{id}/reservable：切換可否預約
export async function updateSeatReservable(id: number, reservable: boolean) {
  const { data } = await employeeClient.patch<Seat>(
    `/admin/tables-config/${id}/reservable`,
    { reservable },
  )
  return data
}

// 新增、編輯桌位共用的欄位
export type SeatInput = {
  tableNo: string
  seats: number
  area: string
}

// POST /api/admin/tables-config：新增桌位
export async function createSeat(input: SeatInput) {
  const { data } = await employeeClient.post<Seat>('/admin/tables-config', input)
  return data
}

// PUT /api/admin/tables-config/{id}：編輯桌位
export async function updateSeat(id: number, input: SeatInput) {
  const { data } = await employeeClient.put<Seat>(`/admin/tables-config/${id}`, input)
  return data
}