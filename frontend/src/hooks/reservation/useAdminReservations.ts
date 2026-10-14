import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelReservationByStaff,
  fetchAdminReservations,
} from '@/services/api/reservation/adminReservationApi'
import { queryScope } from '@/services/client/queryClient'

export const adminReservationKeys = {
  all: [...queryScope.employee, 'reservations'] as const,
  day: (date: string) => [...adminReservationKeys.all, date] as const,
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
