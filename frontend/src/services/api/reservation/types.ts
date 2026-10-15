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

export type CancelSource = 'CUSTOMER' | 'STAFF'

// startTime 這類時間是帶 +08:00 的 ISO 字串。客人端要顯示就直接切字串，不轉成 Date，
// 手機設在別的時區也不會顯示錯；要比先後（排序、取消期限）才用 Date.parse
export type ReservationDetail = {
  reservationId: number
  reservationNo: string
  status: ReservationStatus
  startTime: string
  endTime: string
  adultCount: number
  childCount: number
  partySize: number
  tableNo: string | null
  seats: number | null
  area: string | null
  contactName: string
  member: boolean
  // 取消鈕要不要停用，畫面是拿 cancellableUntil 跟每 30 秒更新的 now 自己比；
  // cancellable 只是抓資料那一刻的結果，頁面放著不動就會過期，所以沒有用它
  cancellableUntil: string
  cancellable: boolean
  cancelSource: CancelSource | null
  cancelledAt: string | null
  hasPreorder: boolean
}

export type CancelledReservation = {
  reservationId: number
  status: ReservationStatus
  cancelSource: CancelSource
  cancelledAt: string
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
