import type { ReservationConfirmation } from '@/features/customer/reserve/reservation.types'

export type ReservationStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export type ReservationType = 'GUEST' | 'MEMBER'

export type SavedReservation = {
  reservation: ReservationConfirmation
  status: ReservationStatus
  cancelSource?: 'CUSTOMER' | 'STAFF'
}

const RESERVATION_STORAGE_KEYS: Record<ReservationType, string> = {
  GUEST: 'smart-order:guest-reservations',
  MEMBER: 'smart-order:member-reservations',
}

export function loadReservations(type: ReservationType): SavedReservation[] {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(RESERVATION_STORAGE_KEYS[type]) ?? '[]',
    ) as unknown
    return Array.isArray(saved)
      ? saved.filter((record) => isSavedReservation(record, type))
      : []
  } catch {
    return []
  }
}

export function saveReservations(type: ReservationType, reservations: SavedReservation[]) {
  try {
    if (reservations.length === 0) {
      window.localStorage.removeItem(RESERVATION_STORAGE_KEYS[type])
    } else {
      window.localStorage.setItem(RESERVATION_STORAGE_KEYS[type], JSON.stringify(reservations))
    }
  } catch {
    // 私密瀏覽或儲存空間不足時，仍保留目前頁面中的訂位資料。
  }
}

export function addReservation(
  current: SavedReservation[],
  reservation: ReservationConfirmation,
  type: ReservationType,
): SavedReservation[] {
  if (current.some((record) => record.reservation.id === reservation.id)) return current
  return [
    { reservation: { ...reservation, reservationType: type }, status: 'CONFIRMED' },
    ...current,
  ]
}

function isSavedReservation(value: unknown, type: ReservationType): value is SavedReservation {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<SavedReservation>
  const reservation = record.reservation
  return Boolean(
    reservation &&
      typeof reservation.id === 'string' &&
      typeof reservation.reservationNo === 'string' &&
      typeof reservation.date === 'string' &&
      typeof reservation.time === 'string' &&
      typeof reservation.partySize === 'number' &&
      typeof reservation.tableNo === 'string' &&
      (!reservation.reservationType || reservation.reservationType === type) &&
      reservation.contact?.name &&
      reservation.contact.phone &&
      ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(record.status ?? ''),
  )
}
