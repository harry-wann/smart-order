import { employeeClient } from '@/services/client/employeeClient'
import type { TableHold } from '../table/tableApi'
import type { CancelSource, ReservationStatus } from './types'

export type AdminReservation = {
  reservationId: number
  reservationNo: string
  startTime: string
  endTime: string
  contactName: string
  contactPhone: string
  member: boolean
  adultCount: number
  childCount: number
  partySize: number
  assignedTableNo: string | null
  seatedTableNo: string | null
  status: ReservationStatus
  holding: boolean
  checkInFrom: string
  checkInUntil: string
  cancelSource: CancelSource | null
  cancelledAt: string | null
  cancelledByStaffName: string | null
  preorderItemCount: number
  // 訂位提醒（模擬簡訊，不是真的簡訊）送出的時間；還沒提醒是 null
  reminderSentAt: string | null
}

// GET /admin/reservations?date=：這一天的全部訂位，含已取消
export async function fetchAdminReservations(date: string, signal?: AbortSignal) {
  const { data } = await employeeClient.get<AdminReservation[]>('/admin/reservations', {
    params: { date },
    signal,
  })
  return data
}

export type AvailableTable = {
  tableId: number
  tableNo: string
  area: string
  seats: number
  upcomingReservationAt: string | null
}

// GET /admin/tables/available：候位選桌的空桌清單
export async function fetchAvailableTables(partySize: number, signal?: AbortSignal) {
  const { data } = await employeeClient.get<AvailableTable[]>('/admin/tables/available', {
    params: { partySize },
    signal,
  })
  return data
}

export type OpenOptions = {
  tableId: number
  tableNo: string
  seats: number
  area: string
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING'
  waitlist: { id: number; no: string; name: string; partySize: number; waitedMinutes: number; status: string }[]
  reservations: {
    id: number
    reservationNo: string
    name: string
    phoneMasked: string
    startTime: string
    adultCount: number
    childCount: number
    partySize: number
    preorderItemCount: number
    assignedTableNo: string | null
  }[]
  heldFor: TableHold | null
  upcomingOnThisTable: { reservationNo: string; name: string; startTime: string; endTime: string; partySize: number } | null
}

// GET /admin/tables/{id}/open-options：開桌頁要的清單，加上這張桌的保留與稍後的訂位
export async function fetchOpenOptions(tableId: number, signal?: AbortSignal) {
  const { data } = await employeeClient.get<OpenOptions>(`/admin/tables/${tableId}/open-options`, { signal })
  return data
}
