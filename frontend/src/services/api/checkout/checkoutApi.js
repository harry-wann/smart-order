import { useQuery } from '@tanstack/react-query'
import { customerClient } from '@/services/client/customerClient'
import { customerTokens } from '@/services/client/tokenStore'
import { queryScope } from '@/services/client/queryClient'

// 兩個權杖都用查詢當下抓住的那一組：查到一半換桌，也不會拿新桌的權杖去配舊桌的請求。
// 舊版只存了用餐權杖、沒有 guest 權杖時照樣送出，後端回 401 INVALID_GUEST_TOKEN，customerClient 會清掉權杖
export async function getBill(signal, sessionToken, guestToken) {
  if (!sessionToken) return null

  const { data } = await customerClient.get('/dining/bill', {
    signal,
    customerAuth: [],
    headers: {
      'X-Session-Token': sessionToken,
      ...(guestToken ? { 'X-Guest-Token': guestToken } : {}),
    },
  })

  // A response from the previous table must never become the current bill.
  if (customerTokens.session.get() !== sessionToken) return null
  return data
}

export function useBill() {
  const sessionToken = customerTokens.session.get()
  const guestToken = customerTokens.guest.get()
  const query = useQuery({
    queryKey: [...queryScope.customerSession, 'bill', sessionToken],
    queryFn: ({ signal }) => getBill(signal, sessionToken, guestToken),
    enabled: Boolean(sessionToken),
    retry: false,
  })

  return { ...query, sessionToken }
}
