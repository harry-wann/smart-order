import type { InternalAxiosRequestConfig } from 'axios'
import type { ApiError } from './ApiError'
import { signOutEmployee } from './auth'
import { createApiClient, sentHeader } from './createApiClient'
import { employeeToken } from './tokenStore'

export const EMPLOYEE_LOGIN_PATH = '/admin/login'

export const employeeClient = createApiClient(redirectToLogin)

employeeClient.interceptors.request.use(attachEmployeeToken)

function attachEmployeeToken(config: InternalAxiosRequestConfig) {
  const token = employeeToken.get()
  if (token && config.url !== LOGIN_API) config.headers.set('Authorization', `Bearer ${token}`)
  return config
}

// 只處理帶著目前這個 token 被拒的請求：登入請求本身不帶 token，打錯密碼不會把其他分頁登出
function redirectToLogin(error: ApiError, config?: InternalAxiosRequestConfig) {
  if (error.status !== 401) return

  const token = employeeToken.get()
  if (!token || sentHeader(config, 'Authorization') !== `Bearer ${token}`) return

  signOutEmployee()
  if (window.location.pathname !== EMPLOYEE_LOGIN_PATH) window.location.replace(EMPLOYEE_LOGIN_PATH)
}

const LOGIN_API = '/admin/auth/login'
