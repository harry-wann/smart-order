import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import OrderHeader from './OrderHeader'
import OrderRecord from './OrderRecord'
import Checkout from './Checkout'

export default function PaymentProcessing({ subtotal = 1420, serviceFee = 142, onCancel }) {
  const [countdown, setCountdown] = useState(3)

  const total = subtotal + serviceFee

  // 3 → 2 → 1 倒數
  useEffect(() => {
    if (countdown <= 1) return

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown])

  return (
    <div className="flex min-h-screen bg-surface text-ink-900">
      {/* 左側選單 */}
      <Sidebar />

      {/* 右側內容 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 上方 Header */}
        <OrderHeader />
        {/* 主要內容 */}
        <main className="flex min-h-0 flex-1 gap-6 p-6">
          {/* 左邊點餐紀錄 */}
          <section className="min-w-0 flex-1">
            <OrderRecord />
          </section>

          {/* 右邊結帳 */}
          <aside className="w-90">
            <Checkout />
          </aside>
        </main>
        // 背景遮罩
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35">
          {/* 付款 Modal */}
          <div className="w-110 rounded-[10px] bg-white px-8 pt-9 pb-8 shadow-lg">
            {/* 桌號 */}
            <div className="flex items-center justify-center gap-2 type-caption text-ink-600">
              {/* 信用卡小圖示 */}

              <span>A03 桌・櫃檯結帳</span>
            </div>

            {/* 標題 */}
            <h2 className="mt-3 text-center type-h1 font-bold text-ink-900">信用卡付款中</h2>

            {/* 倒數圓圈 */}
            <div className="mt-6 flex justify-center">
              <div className="relative flex h-26 w-26 items-center justify-center">
                {/* 淺色底圓 */}
                <div className="absolute inset-0 rounded-pill border-[6px] border-[#F8DFDA]" />

                {/* 上方紅線 */}
                <div className="absolute top-0 left-1/2 h-1.5 w-9.25 -translate-x-1/2 rounded-pill bg-brand-600" />

                {/* 左側紅線 */}
                <div className="absolute top-1/2 left-0 h-9.25 w-1.5 -translate-y-1/2 rounded-pill bg-brand-600" />

                {/* 右側紅線 */}
                <div className="absolute top-1/2 right-0 h-9.25 w-1.5 -translate-y-1/2 rounded-pill bg-brand-600" />

                {/* 下方紅線 */}
                <div className="absolute bottom-0 left-1/2 h-1.5 w-9.25 -translate-x-1/2 rounded-pill bg-brand-600" />

                {/* 倒數數字 */}
                <span className="relative type-kds-table font-bold text-brand-600">
                  {countdown}
                </span>
              </div>
            </div>

            {/* 倒數提示 */}
            <p className="mt-4 text-center type-body-sm text-ink-600">
              秒後送出，按錯付款方式請按取消
            </p>

            {/* 金額 */}
            <div className="mt-4 text-center">
              <p className="type-display font-bold text-ink-900">NT$ {total.toLocaleString()}</p>

              <p className="mt-2 type-caption text-ink-600">
                小計 {subtotal.toLocaleString()}＋服務費 {serviceFee.toLocaleString()}
              </p>
            </div>

            {/* 系統提示 */}
            <div className="mx-auto mt-6 flex h-11.5 max-w-90 items-center rounded-btn bg-surface-2 px-4">
              {/* Info icon */}
              <div className="mr-3 flex h-[16px] w-[16px] items-center justify-center rounded-pill border border-ink-600 type-body-sm text-ink-600">
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
      </div>
    </div>
  )
}
