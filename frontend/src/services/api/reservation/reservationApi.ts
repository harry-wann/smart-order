import { customerClient } from '@/services/client/customerClient'
import type { Availability, CreateReservationInput, ReservationCreated } from './types'

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

// POST /reservations：送出就成立；會員帶 JWT，匿名的聯絡資料放在 body
export async function createReservation({ asMember, ...body }: CreateReservationInput & { asMember: boolean }) {
  const { data } = await customerClient.post<ReservationCreated>(RESERVATIONS, body, {
    customerAuth: asMember ? ['member'] : [],
  })
  return data
}
