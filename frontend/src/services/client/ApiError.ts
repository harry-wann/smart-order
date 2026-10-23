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
  // 只有 429 TOO_MANY_ATTEMPTS 會帶：還要等幾秒才能再試
  retryAfterSeconds?: number
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiErrorDetail[]
  readonly reason?: string
  readonly bill?: unknown
  readonly retryAfterSeconds?: number

  constructor(status: number, body: ApiErrorBody, cause?: unknown) {
    super(body.message ?? DEFAULT_MESSAGE[body.code ?? ''] ?? DEFAULT_MESSAGE.UNKNOWN_ERROR, { cause })
    this.name = 'ApiError'
    this.status = status
    this.code = body.code ?? 'UNKNOWN_ERROR'
    this.details = body.details ?? []
    this.reason = body.reason
    this.bill = body.bill
    this.retryAfterSeconds = body.retryAfterSeconds
  }
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code)
}

// 給使用者看的錯誤訊息。後端 @Valid 沒過時，message 只是固定的總稱（「欄位格式不正確」），
// 具體原因（例如「分類名稱最多 50 個字元」）放在 details，所以有 details 就優先顯示它們；
// 不是 ApiError 的一般 Error 用它自己的 message，都沒有就用 fallback
export function describeApiError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const details = error.details.map((detail) => detail.message).filter(Boolean)
    return details.length > 0 ? details.join('、') : error.message
  }
  return error instanceof Error ? error.message : fallback
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
