import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelReservation, createReservation } from '@/services/api/reservation/reservationApi'
import { saveReservationToken } from '@/services/client/auth'
import { reservationKeys } from './reservationKeys'

// 取消後名額回來了，清單、單筆、可訂時段都重抓
// 用 onSettled：被後端擋下來（過了取消期限、已被櫃檯代取消）時畫面也要重抓，狀態才會跟上
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
      // accessToken 只有建立這一刻拿得到。匿名的先存起來（這格只留最近一筆，
      // 每筆訂位各自的 token 由 Done 記進本機的訪客清單）；會員靠登入身分，不需要
      if (!asMember) saveReservationToken(created.accessToken)
      // 會員的「我的預約」可能還在快取裡，剛訂的這筆要看得到
      else return queryClient.invalidateQueries({ queryKey: reservationKeys.mine() })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...reservationKeys.all, 'availability'] }),
  })
}
