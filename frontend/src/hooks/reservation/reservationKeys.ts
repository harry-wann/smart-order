import { queryScope } from '@/services/client/queryClient'

export const reservationKeys = {
  all: [...queryScope.customer, 'reservation'] as const,
  availability: (date: string, partySize: number) =>
    [...reservationKeys.all, 'availability', date, partySize] as const,
  detail: (id: number) => [...reservationKeys.all, 'detail', id] as const,
  mine: () => [...queryScope.customerMember, 'reservations'] as const,
}
