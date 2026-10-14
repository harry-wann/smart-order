import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createReservation } from '@/services/api/reservation/reservationApi'
import { saveReservationToken } from '@/services/client/auth'
import { reservationKeys } from './reservationKeys'

// 不管成功或客滿，時段剩幾桌都變了，讓可訂時段重抓
export function useCreateReservation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createReservation,
    onSuccess: (created, { asMember }) => {
      if (!asMember) saveReservationToken(created.accessToken)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...reservationKeys.all, 'availability'] }),
  })
}
