import { useEffect, useState } from 'react'

// 原路徑 src/features/order-checkbill

export default function PaymentProcessing({
  paymentMethod,
  subtotal,
  serviceFee,
  onCancel,
  onComplete,
}) {
  const [countdown, setCountdown] = useState(3)

  const total = subtotal + serviceFee

  // 判斷付款方式
  const paymentTitle = paymentMethod === 'cash' ? '現金付款中' : '信用卡付款中'

  // 3 → 2 → 1 → 關閉
  useEffect(() => {
    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1)
      } else {
        onComplete()
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35">
      <div className="w-110 bg-white px-8 pt-9 pb-8 shadow-lg">
        {/* 桌號 */}
        <div className="flex items-center justify-center gap-2 type-caption text-ink-600">
          <span>A03 桌・櫃檯結帳</span>
        </div>

        {/* 付款方式 */}
        <h2 className="mt-3 text-center type-h1 font-bold text-ink-900">{paymentTitle}</h2>

        {/* 倒數圓圈 */}
        <div className="mt-6 flex justify-center">
          <div className="relative flex h-26 w-26 items-center justify-center">
            {/* 淺色底圓 */}
            <div className="absolute inset-0 rounded-pill border-[6px] border-surface-2" />

            {/* 旋轉紅線 */}
            <div className="absolute inset-0 animate-spin">
              <div className="absolute top-0 left-1/2 h-1.5 w-9.25 -translate-x-1/2 rounded-pill bg-brand-600" />

              <div className="absolute top-1/2 left-0 h-9.25 w-1.5 -translate-y-1/2 rounded-pill bg-brand-600" />

              <div className="absolute top-1/2 right-0 h-9.25 w-1.5 -translate-y-1/2 rounded-pill bg-brand-600" />

              <div className="absolute bottom-0 left-1/2 h-1.5 w-9.25 -translate-x-1/2 rounded-pill bg-brand-600" />
            </div>

            {/* 倒數 */}
            <span className="relative z-10 type-kds-table font-bold text-brand-600">
              {countdown}
            </span>
          </div>
        </div>

        {/* 提示 */}
        <p className="mt-4 text-center type-body-sm text-ink-600">秒後送出，按錯付款方式請按取消</p>

        {/* 金額 */}
        <div className="mt-4 text-center">
          <p className="type-display font-bold text-ink-900">NT$ {total.toLocaleString()}</p>

          <p className="mt-2 type-caption text-ink-600">
            小計 {subtotal.toLocaleString()}＋服務費 {serviceFee.toLocaleString()}
          </p>
        </div>

        {/* 系統提示 */}
        <div className="mx-auto mt-6 flex h-11.5 max-w-90 items-center rounded-btn bg-surface-2 px-4">
          <div className="mr-3 flex h-4 w-4 items-center justify-center rounded-pill border border-ink-600 type-body-sm text-ink-600">
            i
          </div>

          <p className="type-body-sm text-ink-600">本系統為教學專題，付款為模擬流程</p>
        </div>

        {/* 取消 */}
        <button
          type="button"
          onClick={onCancel}
          className="mt-6 w-full cursor-pointer text-center type-h3 text-ink-600 hover:text-brand-600"
        >
          取消
        </button>
      </div>
    </div>
  )
}
