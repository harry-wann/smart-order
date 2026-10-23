import { useQuery } from '@tanstack/react-query'
import { customerClient } from '@/services/client/customerClient'
import { customerTokens } from '@/services/client/tokenStore'
import { queryScope } from '@/services/client/queryClient'

export async function getBill(signal, sessionToken) {
  if (!sessionToken) return null

  const { data } = await customerClient.get('/dining/bill', {
    signal,
    customerAuth: [],
    headers: { 'X-Session-Token': sessionToken },
  })

  // A response from the previous table must never become the current bill.
  if (customerTokens.session.get() !== sessionToken) return null
  return data
}

export function useBill() {
  const sessionToken = customerTokens.session.get()
  const query = useQuery({
    queryKey: [...queryScope.customerSession, 'bill', sessionToken],
    queryFn: ({ signal }) => getBill(signal, sessionToken),
    enabled: Boolean(sessionToken),
    retry: false,
  })

  return { ...query, sessionToken }
}
