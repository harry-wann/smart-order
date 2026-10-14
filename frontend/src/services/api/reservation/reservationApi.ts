import { customerClient } from '@/services/client/customerClient'
import type { Availability, CreateReservationInput, ReservationCreated, ReservationDetail } from './types'

const RESERVATIONS = '/reservations'

// GET /reservations/availability?date=&partySize=：當天每個時段還剩幾桌
export async function fetchAvailability(date: string, partySize: number, signal?: AbortSignal) {
  const { data } = await customerClient.get<Availability>(`${RESERVATIONS}/availability`, {
    params: { date, partySize },
    customerAuth: [],
    signal,
  })
  return data
}

// GET /reservations/{id}：匿名帶訂位時拿到的 accessToken，沒有就用會員身分查
export async function fetchReservation(id: number, accessToken?: string | null, signal?: AbortSignal) {
  const { data } = await customerClient.get<ReservationDetail>(`${RESERVATIONS}/${id}`, {
    headers: accessToken ? { 'X-Reservation-Token': accessToken } : undefined,
    customerAuth: accessToken ? [] : ['member'],
    signal,
  })
  return data
}

// POST /reservations：送出就成立；會員帶 JWT，匿名的聯絡資料放在 body
export async function createReservation({ asMember, ...body }: CreateReservationInput & { asMember: boolean }) {
  const { data } = await customerClient.post<ReservationCreated>(RESERVATIONS, body, {
    customerAuth: asMember ? ['member'] : [],
  })
  return data
}
