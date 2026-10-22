import { isAxiosError, isCancel } from 'axios'

export type ApiErrorDetail = {
  field?: string
  message: string
  value?: unknown
}

export type ApiErrorBody = {
  code?: string
  message?: string
  details?: ApiErrorDetail[]
  reason?: string
  bill?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiErrorDetail[]
  readonly reason?: string
  readonly bill?: unknown

  constructor(status: number, body: ApiErrorBody, cause?: unknown) {
    super(body.message ?? DEFAULT_MESSAGE[body.code ?? ''] ?? DEFAULT_MESSAGE.UNKNOWN_ERROR, { cause })
    this.name = 'ApiError'
    this.status = status
    this.code = body.code ?? 'UNKNOWN_ERROR'
    this.details = body.details ?? []
    this.reason = body.reason
    this.bill = body.bill
  }
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code)
}

export function toApiError(error: unknown) {
  if (error instanceof ApiError || isCancel(error)) return error
  if (!isAxiosError(error)) return new ApiError(0, { code: 'UNKNOWN_ERROR' }, error)
  if (!error.response) {
    return new ApiError(0, { code: error.code === 'ETIMEDOUT' ? 'TIMEOUT' : 'NETWORK_ERROR' }, error)
  }

  const { status, data } = error.response
  return new ApiError(status, isErrorBody(data) ? data : {}, error)
}

const DEFAULT_MESSAGE: Record<string, string> = {
  NETWORK_ERROR: '連線失敗，請檢查網路',
  TIMEOUT: '連線逾時，請稍後再試',
  UNKNOWN_ERROR: '發生錯誤，請稍後再試',
}

function isErrorBody(data: unknown): data is ApiErrorBody {
  return typeof data === 'object' && data !== null
}
