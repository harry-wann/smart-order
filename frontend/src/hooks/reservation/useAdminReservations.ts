import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelReservationByStaff,
  fetchAdminReservations,
  fetchAvailableTables,
  seatReservation,
} from '@/services/api/reservation/adminReservationApi'
import { queryScope } from '@/services/client/queryClient'

export const adminReservationKeys = {
  all: [...queryScope.employee, 'reservations'] as const,
  day: (date: string) => [...adminReservationKeys.all, date] as const,
  availableTables: (partySize: number, reservationId?: number) =>
    [...queryScope.employee, 'tables', 'available', partySize, reservationId ?? null] as const,
}

// 櫃檯一直開著這頁，每 30 秒重抓一次，報到、取消、逾時才跟得上
export function useAdminReservations(date: string) {
  return useQuery({
    queryKey: adminReservationKeys.day(date),
    queryFn: ({ signal }) => fetchAdminReservations(date, signal),
    refetchInterval: 30_000,
  })
}

export function useCancelReservationByStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelReservationByStaff,
    onSettled: () => queryClient.invalidateQueries({ queryKey: adminReservationKeys.all }),
  })
}

// 對話框開著才查；空桌隨時在變，每次打開都重抓
export function useAvailableTables(partySize: number, reservationId: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: adminReservationKeys.availableTables(partySize, reservationId),
    queryFn: ({ signal }) => fetchAvailableTables(partySize, reservationId, signal),
    enabled,
    staleTime: 0,
  })
}

export function useSeatReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: seatReservation,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminReservationKeys.all }),
        queryClient.invalidateQueries({ queryKey: [...queryScope.employee, 'tables'] }),
      ]),
  })
}
