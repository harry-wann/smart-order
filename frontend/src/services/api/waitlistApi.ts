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
}

// GET /api/admin/waitlist：S-10 候位清單（等待中、已叫號）
export async function fetchWaitlist(signal?: AbortSignal) {
  const { data } = await employeeClient.get<WaitlistEntry[]>('/admin/waitlist', { signal })
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

// DELETE /api/admin/waitlist/{id}：放棄
export async function abandonWaitlist(id: number) {
  await employeeClient.delete(`/admin/waitlist/${id}`)
}