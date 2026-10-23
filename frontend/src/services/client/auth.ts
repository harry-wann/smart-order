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

// 用餐權杖與同桌 guest 權杖一定成對：後端要兩個都對得上才認得是哪位 guest
export function joinTable(sessionToken: string, guestToken: string) {
  clearCustomerSessionQueries()
  customerTokens.session.set(sessionToken)
  customerTokens.guest.set(guestToken)
}

export function leaveTable() {
  customerTokens.session.clear()
  customerTokens.guest.clear()
  clearCustomerSessionQueries()
}

function clearCustomerSessionQueries() {
  queryClient.removeQueries({ queryKey: queryScope.customerSession })
  // Clear bills cached by the previous, unscoped query key during a live session update.
  queryClient.removeQueries({ queryKey: ['customer', 'bill'] })
}

export function saveReservationToken(accessToken: string) {
  customerTokens.reservation.set(accessToken)
}

export function clearReservationToken() {
  customerTokens.reservation.clear()
}
