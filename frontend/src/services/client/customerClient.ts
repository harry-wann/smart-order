import type { InternalAxiosRequestConfig } from 'axios'
import type { ApiError } from './ApiError'
import { leaveTable, signOutMember } from './auth'
import { createApiClient, sentHeader } from './createApiClient'
import { customerTokens, getDeviceId } from './tokenStore'

export type CustomerCredential = 'session' | 'member' | 'reservation'

declare module 'axios' {
  interface AxiosRequestConfig {
    customerAuth?: CustomerCredential[]
  }
}

export const customerClient = createApiClient(clearRejectedToken)

customerClient.interceptors.request.use(attachCustomerHeaders)

function attachCustomerHeaders(config: InternalAxiosRequestConfig) {
  // 只是提示，後端不拿它判斷身分
  config.headers.set('X-Device-Id', getDeviceId())

  for (const credential of config.customerAuth ?? DEFAULT_CREDENTIALS) {
    for (const [name, value] of CREDENTIAL_HEADERS[credential]()) {
      if (value) config.headers.set(name, value)
    }
  }

  return config
}

// 只清掉這次真的送出去、而且現在還存著的那一個；送出後才換過的新 token 不能被舊回應清掉
function clearRejectedToken(error: ApiError, config?: InternalAxiosRequestConfig) {
  if (error.status !== 401) return

  const sentSession = sentHeader(config, 'X-Session-Token')
  if (
    (error.code === 'INVALID_SESSION_TOKEN' || error.code === 'INVALID_GUEST_TOKEN')
    && sentSession
    && sentSession === customerTokens.session.get()
  ) {
    leaveTable()
  }

  const sentMember = sentHeader(config, 'Authorization')
  if (error.code === 'UNAUTHORIZED' && sentMember && sentMember === bearer(customerTokens.member.get())) {
    signOutMember()
  }
}

const DEFAULT_CREDENTIALS: CustomerCredential[] = ['session']

// session 一次帶兩個：X-Session-Token 說坐哪一桌，X-Guest-Token 證明是哪位 guest
const CREDENTIAL_HEADERS: Record<CustomerCredential, () => [string, string | null][]> = {
  session: () => [
    ['X-Session-Token', customerTokens.session.get()],
    ['X-Guest-Token', customerTokens.guest.get()],
  ],
  member: () => [['Authorization', bearer(customerTokens.member.get())]],
  reservation: () => [['X-Reservation-Token', customerTokens.reservation.get()]],
}

function bearer(token: string | null) {
  return token ? `Bearer ${token}` : null
}
