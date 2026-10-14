import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchAvailability } from '@/services/api/reservation/reservationApi'
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
