import { queryScope } from '@/services/client/queryClient'

// all 是可訂時段和單筆訂位，掛在 customer 底下；mine 是會員自己的清單，掛在 customerMember 底下，
// 會員登入、登出時整批清掉，換人不會看到上一個人的預約
export const reservationKeys = {
  all: [...queryScope.customer, 'reservation'] as const,
  availability: (date: string, partySize: number) =>
    [...reservationKeys.all, 'availability', date, partySize] as const,
  detail: (id: number) => [...reservationKeys.all, 'detail', id] as const,
  mine: () => [...queryScope.customerMember, 'reservations'] as const,
}
