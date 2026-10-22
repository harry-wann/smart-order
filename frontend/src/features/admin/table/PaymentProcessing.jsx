import { useEffect, useRef, useState } from 'react'

const PAYMENT_TITLES = {
  CASH: '現金付款確認中',
  CARD: '信用卡付款確認中',
  BARCODE: '條碼付款確認中',
}

function money(value) {
  return Number(value ?? 0).toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function PaymentProcessing({ payment, submitting, onCancel, onComplete, onSuccess }) {
  const [countdown, setCountdown] = useState(5)
  const [phase, setPhase] = useState('countdown')
  const [error, setError] = useState('')
  const mountedRef = useRef(false)
  const submittedAttemptRef = useRef(null)
  const paymentRef = useRef(payment)
  const onCancelRef = useRef(onCancel)
  const onCompleteRef = useRef(onComplete)
  const onSuccessRef = useRef(onSuccess)

  useEffect(() => {
    paymentRef.current = payment
    onCancelRef.current = onCancel
    onCompleteRef.current = onComplete
    onSuccessRef.current = onSuccess
  }, [payment, onCancel, onComplete, onSuccess])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let active = true
    let timerId
    const attemptId = payment.attemptId
    const deadline = Date.now() + 5000

    function tick() {
      if (!active || !mountedRef.current) return
      const remainingMs = deadline - Date.now()
      if (remainingMs <= 0) {
        setCountdown(0)
        if (submittedAttemptRef.current === attemptId) return
        submittedAttemptRef.current = attemptId
        setPhase('submitting')

        Promise.resolve()
          .then(() => onCompleteRef.current(paymentRef.current))
          .then((success) => {
            if (
              !mountedRef.current ||
              paymentRef.current?.attemptId !== attemptId ||
              success !== true
            ) {
              return
            }
            setPhase('success')
          })
          .catch((submitError) => {
            if (!mountedRef.current || paymentRef.current?.attemptId !== attemptId) return
            setError(submitError?.message || '付款沒有完成，請返回後重新確認。')
            setPhase('error')
          })
        return
      }

      setCountdown(Math.ceil(remainingMs / 1000))
      timerId = window.setTimeout(tick, Math.min(1000, remainingMs))
    }

    tick()
    return () => {
      active = false
      window.clearTimeout(timerId)
    }
  }, [payment])

  useEffect(() => {
    if (phase !== 'success') return undefined
    const attemptId = payment.attemptId
    const timerId = window.setTimeout(() => {
      if (mountedRef.current && paymentRef.current?.attemptId === attemptId) {
        onSuccessRef.current(attemptId)
      }
    }, 1500)
    return () => window.clearTimeout(timerId)
  }, [phase, payment])

  const busy = phase === 'submitting' || submitting
  const paymentTitle = PAYMENT_TITLES[payment.method] ?? '付款確認中'

  function handleCancel() {
    if (busy || phase === 'success') return
    onCancelRef.current(payment.attemptId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-processing-title"
        className="my-auto w-full max-w-md rounded-card bg-surface px-5 py-7 shadow-pop sm:px-8 sm:py-9"
      >
        <p className="text-center type-caption text-ink-600">
          {payment.tableNumber} 桌・櫃檯結帳
        </p>

        <h2 id="payment-processing-title" className="mt-3 text-center type-h2 font-bold text-ink-900">
          {phase === 'success' ? '付款完成' : paymentTitle}
        </h2>

        <div className="mt-6 flex justify-center">
          <div className={`flex size-24 items-center justify-center rounded-full ${phase === 'success' ? 'bg-success-bg text-success' : 'bg-brand-100 text-brand-600'}`}>
            {phase === 'success' ? (
              <span aria-label="付款成功" role="img" className="text-5xl font-bold">✓</span>
            ) : (
              <span className="text-4xl font-bold tabular-nums">
                {busy ? '…' : countdown}
              </span>
            )}
          </div>
        </div>

        <p className="mt-4 min-h-6 text-center type-body-sm text-ink-600" aria-live="polite">
          {phase === 'success'
            ? '正在返回桌位總覽…'
            : busy
              ? '正在送出付款，請稍候'
              : phase === 'error'
                ? '付款沒有完成，請檢查訊息後返回'
                : `${countdown} 秒後送出付款`}
        </p>

        <div className="mt-5 rounded-card border border-line bg-surface-2 p-4 text-center">
          <p className="type-h2 font-bold tabular-nums text-ink-900">NT$ {money(payment.total)}</p>
          <p className="mt-2 type-caption tabular-nums text-ink-600">
            小計 NT$ {money(payment.subtotal)} ・ 服務費 NT$ {money(payment.serviceFee)}
          </p>
        </div>

        <p className="mt-5 rounded-btn bg-surface-2 p-3 text-center type-caption text-ink-600">
          此為模擬付款流程，不會產生真實交易。
        </p>

        {error && <p role="alert" className="mt-4 text-center type-body-sm text-danger">{error}</p>}

        {phase !== 'success' && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={busy}
            className="mt-6 min-h-11 w-full cursor-pointer rounded-btn border border-line px-4 py-2 type-button text-ink-700 transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === 'error' ? '返回，不重新送出' : '取消付款'}
          </button>
        )}
      </section>
    </div>
  )
}
