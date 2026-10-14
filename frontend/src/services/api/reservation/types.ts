export type ReservationStatus = 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW'

export type AvailabilitySlot = {
  time: string
  available: boolean
  remainingTables: number
}

export type Availability = {
  date: string
  diningMinutes: number
  bufferMinutes: number
  slots: AvailabilitySlot[]
}

export type CreateReservationInput = {
  startTime: string
  adultCount: number
  childCount: number
  contactName?: string
  contactPhone?: string
  contactEmail?: string | null
}

export type ReservationCreated = {
  reservationId: number
  reservationNo: string
  accessToken: string
  tableNo: string
  seats: number
  startTime: string
  endTime: string
  status: ReservationStatus
  cancellableUntil: string
  preorderEditableUntil: string
  hasPreorder: boolean
}
