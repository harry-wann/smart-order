import { queryClient, queryScope } from './queryClient'
import { customerTokens, employeeToken } from './tokenStore'

export function signInEmployee(token: string) {
  queryClient.removeQueries({ queryKey: queryScope.employee })
  employeeToken.set(token)
}

export function signOutEmployee() {
  employeeToken.clear()
  queryClient.removeQueries({ queryKey: queryScope.employee })
}

export function signInMember(token: string) {
  queryClient.removeQueries({ queryKey: queryScope.customerMember })
  customerTokens.member.set(token)
}

export function signOutMember() {
  customerTokens.member.clear()
  queryClient.removeQueries({ queryKey: queryScope.customerMember })
}

export function joinTable(sessionToken: string) {
  queryClient.removeQueries({ queryKey: queryScope.customerSession })
  customerTokens.session.set(sessionToken)
}

export function leaveTable() {
  customerTokens.session.clear()
  queryClient.removeQueries({ queryKey: queryScope.customerSession })
}

export function saveReservationToken(accessToken: string) {
  customerTokens.reservation.set(accessToken)
}

export function clearReservationToken() {
  customerTokens.reservation.clear()
}
