import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelReservation, createReservation } from '@/services/api/reservation/reservationApi'
import { saveReservationToken } from '@/services/client/auth'
import { reservationKeys } from './reservationKeys'

// 取消後名額回來了，清單、單筆、可訂時段都重抓
export function useCancelReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelReservation,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: reservationKeys.all }),
        queryClient.invalidateQueries({ queryKey: reservationKeys.mine() }),
      ]),
  })
}

// 不管成功或客滿，時段剩幾桌都變了，讓可訂時段重抓
export function useCreateReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createReservation,
    onSuccess: (created, { asMember }) => {
      if (!asMember) saveReservationToken(created.accessToken)
      // 會員的「我的預約」可能還在快取裡，剛訂的這筆要看得到
      else return queryClient.invalidateQueries({ queryKey: reservationKeys.mine() })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...reservationKeys.all, 'availability'] }),
  })
}
