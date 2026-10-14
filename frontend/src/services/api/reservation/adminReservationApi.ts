import { employeeClient } from '@/services/client/employeeClient'
import type { CancelledReservation, CancelSource, ReservationStatus } from './types'

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
}

// GET /admin/reservations?date=：這一天的全部訂位，含已取消
export async function fetchAdminReservations(date: string, signal?: AbortSignal) {
  const { data } = await employeeClient.get<AdminReservation[]>('/admin/reservations', {
    params: { date },
    signal,
  })
  return data
}

// POST /admin/reservations/{id}/cancel：櫃檯代客取消，隨時可以取消
export async function cancelReservationByStaff({ id, reason }: { id: number; reason?: string }) {
  const { data } = await employeeClient.post<CancelledReservation & { cancelledByStaffName: string }>(
    `/admin/reservations/${id}/cancel`,
    reason ? { reason } : undefined,
  )
  return data
}

export type AvailableTable = {
  tableId: number
  tableNo: string
  area: string
  seats: number
  upcomingReservationAt: string | null
  isOwnHold: boolean
}

export type SeatResult = {
  diningSessionId: number
  tableNo: string
  adultCount: number
  childCount: number
  preorderTicketId: number | null
  soldOut: { name: string; quantity: number; reason: string }[]
}

// GET /admin/tables/available：從人出發開桌的空桌清單；帶 reservationId 時自己的原保留桌排第一
export async function fetchAvailableTables(partySize: number, reservationId?: number, signal?: AbortSignal) {
  const { data } = await employeeClient.get<AvailableTable[]>('/admin/tables/available', {
    params: { partySize, reservationId },
    signal,
  })
  return data
}

// POST /admin/reservations/{id}/seat：報到並開桌
export async function seatReservation({ id, tableId }: { id: number; tableId: number }) {
  const { data } = await employeeClient.post<SeatResult>(`/admin/reservations/${id}/seat`, { tableId })
  return data
}
