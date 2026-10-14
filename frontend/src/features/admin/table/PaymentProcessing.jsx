import { useEffect, useState } from 'react'

export default function PaymentProcessing({
                                            paymentMethod,
                                            tableNumber,
                                            subtotal = 0,
                                            serviceFee = 0,
                                            onCancel,
                                            onComplete,
                                          }) {
  const [countdown, setCountdown] = useState(3)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const total = Number(subtotal) + Number(serviceFee)

  const paymentTitle = {
    cash: '現金付款中',
    credit: '信用卡付款中',
    barcode: '條碼付款中',
  }[paymentMethod] || '付款中'

  // 倒數 3 → 2 → 1
  useEffect(() => {
    if (countdown <= 1) return

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown])

  // 倒數結束，呼叫付款 API
  useEffect(() => {
    if (countdown !== 1 || submitting || error) return

    const timer = setTimeout(async () => {
      setSubmitting(true)

      try {
        await onComplete()
      } catch (err) {
        setError(err.message || '付款失敗')
        setSubmitting(false)
      }
    }, 10000)

    return () => clearTimeout(timer)
  }, [countdown, submitting, error, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35">
      <div className="w-110 rounded-[10px] bg-white px-8 pt-9 pb-8 shadow-lg">
        {/* 桌號 */}
        <p className="text-center type-caption text-ink-600">
          {tableNumber} 桌・櫃檯結帳
        </p>

        {/* 標題 */}
        <h2 className="mt-3 text-center type-h1 font-bold">
          {paymentTitle}
        </h2>

        {/* 倒數動畫 */}
        <div className="mt-6 flex justify-center">
          <div className="relative flex h-26 w-26 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-[6px] border-surface-2" />

            <div
              className={`absolute inset-0 rounded-full border-[6px] border-transparent border-t-brand-600 ${
                countdown > 1 ? 'animate-spin' : ''}`}
            />

            <span className="relative z-10 text-4xl font-bold text-brand-600">
              {submitting ? '...' : countdown}
            </span>
          </div>
        </div>

        {/* 說明 */}
        <p className="mt-4 text-center type-body-sm text-ink-600">
          {submitting ? '正在送出付款，請稍候' : '秒後送出付款'}
        </p>

        {/* 金額 */}
        <div className="mt-5 text-center">
          <p className="text-3xl font-bold text-ink-900">
            NT$ {total.toLocaleString()}
          </p>

          <p className="mt-2 type-caption text-ink-600">
            小計 NT$ {Number(subtotal).toLocaleString()}
            {' ＋ '}
            服務費 NT$ {Number(serviceFee).toLocaleString()}
          </p>
        </div>

        {/* 提示 */}
        <div className="mt-6 rounded-btn bg-surface-2 p-4">
          <p className="text-center type-body-sm text-ink-600">
            此為模擬付款流程，不會產生真實交易
          </p>
        </div>

        {/* 錯誤 */}
        {error && (
          <p role="alert" className="mt-4 text-center text-brand-600">
            {error}
          </p>
        )}

        {/* 取消按鈕 */}
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="mt-6 w-full cursor-pointer text-center type-h3 text-ink-600 transition hover:text-brand-600 disabled:opacity-50"
        >
          {error ? '返回' : '取消'}
        </button>
      </div>
    </div>
  )
}