import axios, { isAxiosError, type InternalAxiosRequestConfig } from 'axios'
import { ApiError, toApiError } from './ApiError'

export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export type ApiErrorHandler = (error: ApiError, config?: InternalAxiosRequestConfig) => void

export function createApiClient(onError?: ApiErrorHandler) {
  const client = axios.create({
    baseURL: API_BASE,
    timeout: 15_000,
    allowAbsoluteUrls: false,
    transitional: { clarifyTimeoutError: true },
  })

  client.interceptors.response.use(undefined, (error: unknown) => {
    const apiError = toApiError(error)
    if (apiError instanceof ApiError) onError?.(apiError, isAxiosError(error) ? error.config : undefined)
    return Promise.reject(apiError)
  })

  return client
}

export function sentHeader(config: InternalAxiosRequestConfig | undefined, name: string) {
  const value = config?.headers?.get(name)
  return typeof value === 'string' ? value : null
}
