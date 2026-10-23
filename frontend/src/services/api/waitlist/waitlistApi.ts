import { employeeClient } from '@/services/client/employeeClient'

// 後端 WaitlistResponse 回來的一組候位
export type WaitlistEntry = {
  id: number
  ticketNo: string
  contactName: string
  contactPhone: string
  adultCount: number
  childCount: number
  partySize: number
  status: 'WAITING' | 'CALLED' | 'SEATED' | 'ABANDONED' | 'EXPIRED'
  createdAt: string
  calledAt: string | null
  seatedAt: string | null
  expiredAt: string | null
}

export type WaitlistTodaySummary = {
  date: string
  timezone: 'Asia/Taipei' | string
  waitingCount: number
  calledCount: number
  seatedCount: number
  expiredCount: number
  abandonedCount: number
  averageWaitMinutes: number
}

// WaitlistEntity stores restaurant-local LocalDateTime values; normalize those to the
// business timezone when Jackson serializes them without an explicit offset.
export function parseWaitlistTimestamp(value: string) {
  const hasOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
  return new Date(hasOffset ? value : `${value}+08:00`)
}

// GET /api/admin/waitlist：S-10 候位清單（等待中、已叫號）
export async function fetchWaitlist(signal?: AbortSignal) {
  const { data } = await employeeClient.get<WaitlistEntry[]>('/admin/waitlist', { signal })
  return data
}

// GET /api/admin/waitlist/today-summary：台北營業日的候位狀態與入座等待統計
export async function fetchWaitlistTodaySummary(signal?: AbortSignal) {
  const { data } = await employeeClient.get<WaitlistTodaySummary>('/admin/waitlist/today-summary', {
    signal,
  })
  return data
}

// POST /api/admin/waitlist：現場登記取號
export async function registerWaitlist(contactName: string, contactPhone: string, partySize: number) {
  const { data } = await employeeClient.post<WaitlistEntry>('/admin/waitlist', {
    contactName,
    contactPhone,
    partySize,
  })
  return data
}

// POST /api/admin/waitlist/{id}/call：叫號
export async function callWaitlist(id: number) {
  const { data } = await employeeClient.post<WaitlistEntry>(`/admin/waitlist/${id}/call`)
  return data
}

// CALLED 且仍在原期限內時，API 會重新推播叫號但不延長期限。
export async function recallWaitlist(id: number) {
  const { data } = await employeeClient.post<WaitlistEntry>(`/admin/waitlist/${id}/call`)
  return data
}

// DELETE /api/admin/waitlist/{id}：放棄
export async function abandonWaitlist(id: number) {
  await employeeClient.delete(`/admin/waitlist/${id}`)
}

// POST /api/admin/waitlist/{id}/seat：報到開桌，body 帶店員選的那張桌
export async function seatWaitlist(id: number, tableId: number) {
  const { data } = await employeeClient.post<WaitlistEntry>(`/admin/waitlist/${id}/seat`, { tableId })
  return data
}
