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
