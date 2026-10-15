import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import {
  fetchAvailability,
  fetchMyReservations,
  fetchReservation,
} from '@/services/api/reservation/reservationApi'
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

export function useMyReservations(enabled: boolean) {
  return useQuery({
    queryKey: reservationKeys.mine(),
    queryFn: ({ signal }) => fetchMyReservations(signal),
    enabled,
  })
}

// 匿名訂位：這支手機記住的每一筆都各自帶自己的 accessToken 去查；查不到的（例如資料被清掉）就略過
// queryKey 跟單筆的 detail(id) 同一把，Done 剛查過的直接用快取，取消後 invalidate(all) 也會一起重抓
export function useGuestReservations(records: { id: number; accessToken: string }[]) {
  return useQueries({
    queries: records.map(({ id, accessToken }) => ({
      queryKey: reservationKeys.detail(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchReservation(id, accessToken, signal),
    })),
    combine: (results) => ({
      data: results.flatMap((result) => (result.data ? [result.data] : [])),
      isPending: results.some((result) => result.isPending),
    }),
  })
}

// 網址上的 id 不是數字時 Number() 會變 NaN，這種就不發請求
export function useReservation(id: number, accessToken?: string | null) {
  return useQuery({
    queryKey: reservationKeys.detail(id),
    queryFn: ({ signal }) => fetchReservation(id, accessToken, signal),
    enabled: Number.isInteger(id) && id > 0,
  })
}
