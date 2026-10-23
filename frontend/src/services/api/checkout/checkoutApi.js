import { useQuery } from '@tanstack/react-query'
import { customerClient } from '@/services/client/customerClient'

export async function getBill(signal) {
  const { data } = await customerClient.get('/dining/bill', { signal })
  return data
}

export function useBill() {
  return useQuery({
    queryKey: ['customer', 'bill'],
    queryFn: ({ signal }) => getBill(signal),
    retry: false,
  })
}
