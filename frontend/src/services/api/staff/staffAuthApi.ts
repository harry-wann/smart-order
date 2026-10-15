import { employeeClient } from '@/services/client/employeeClient'

export type StaffRole = 'COUNTER' | 'KITCHEN' | 'MANAGER'

export type StaffLoginResult = {
  token: string
  expiresAt: string
  staff: { id: number; displayName: string; role: StaffRole }
}

// POST /admin/auth/login：員工帳密登入，拿 12 小時效期的員工 JWT
export async function loginStaff(username: string, password: string) {
  const { data } = await employeeClient.post<StaffLoginResult>('/admin/auth/login', { username, password })
  return data
}
