import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchAvailability, fetchReservation } from '@/services/api/reservation/reservationApi'
import { reservationKeys } from './reservationKeys'

// 換日期或人數時先留著上一份時段，按鈕不會整排閃掉
export function useAvailability(date: string, partySize: number) {
  return useQuery({
    queryKey: reservationKeys.availability(date, partySize),
    queryFn: ({ signal }) => fetchAvailability(date, partySize, signal),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  })
}

export function useReservation(id: number, accessToken?: string | null) {
  return useQuery({
    queryKey: reservationKeys.detail(id),
    queryFn: ({ signal }) => fetchReservation(id, accessToken, signal),
    enabled: Number.isInteger(id) && id > 0,
  })
}
