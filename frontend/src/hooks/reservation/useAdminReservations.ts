import { useQuery } from '@tanstack/react-query'
import {
  fetchAdminReservations,
  fetchAvailableTables,
  fetchOpenOptions,
} from '@/services/api/reservation/adminReservationApi'
import { queryScope } from '@/services/client/queryClient'

export const adminReservationKeys = {
  all: [...queryScope.employee, 'reservations'] as const,
  day: (date: string) => [...adminReservationKeys.all, date] as const,
  // 空桌清單和開桌選項不放在 reservations 底下；報到、取消兩邊都會動到，所以 mutation 各 invalidate 一次
  tables: [...queryScope.employee, 'tables'] as const,
  availableTables: (partySize: number) =>
    [...adminReservationKeys.tables, 'available', partySize] as const,
  openOptions: (tableId: number) => [...adminReservationKeys.tables, 'open-options', tableId] as const,
}

// 櫃檯一直開著這頁，每 30 秒重抓一次，報到、取消、逾時才跟得上
export function useAdminReservations(date: string) {
  return useQuery({
    queryKey: adminReservationKeys.day(date),
    queryFn: ({ signal }) => fetchAdminReservations(date, signal),
    refetchInterval: 30_000,
  })
}

// 對話框開著才查；空桌隨時在變，每次打開都重抓
export function useAvailableTables(partySize: number, enabled: boolean) {
  return useQuery({
    queryKey: adminReservationKeys.availableTables(partySize),
    queryFn: ({ signal }) => fetchAvailableTables(partySize, signal),
    enabled,
    staleTime: 0,
  })
}

// 開桌頁：保留、可報到的預約都跟著時間在變，30 秒重抓一次
// tableId 要等座位設定查回來才有，沒有就不發請求；?? 0 只是讓 queryKey 和型別過得去
export function useOpenOptions(tableId: number | undefined) {
  return useQuery({
    queryKey: adminReservationKeys.openOptions(tableId ?? 0),
    queryFn: ({ signal }) => fetchOpenOptions(tableId ?? 0, signal),
    enabled: tableId !== undefined,
    refetchInterval: 30_000,
  })
}
