import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './ApiError'

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError
  }
}

export const queryScope = {
  customer: ['customer'],
  customerMember: ['customer', 'member'],
  customerSession: ['customer', 'session'],
  employee: ['employee'],
  demo: ['demo'],
} as const

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
})

function shouldRetry(failureCount: number, error: ApiError) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 2
}
