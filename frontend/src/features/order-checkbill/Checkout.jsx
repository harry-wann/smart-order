import { useState } from 'react'
import blackpeople from '../../assets/ic_Checkout_blackpeople.svg'

export default function Checkout() {
  const [phone, setPhone] = useState('0912345678')

  return (
    <div className="w-full rounded-btn border border-line bg-surface p-5 shadow-sm">
      {/* ==================== 標題 ==================== */}
      <div className="flex items-center justify-between">
        <h2 className="type-h3">結帳</h2>

        <span className="type-caption text-ink-600">客人到櫃檯付款</span>
      </div>

      {/* ==================== 金額 ==================== */}
      <div className="mt-4 space-y-4 type-body">
        <div className="flex justify-between">
          <span>小計 6 項</span>

          <span className="type-body">NT$ 1,420</span>
        </div>

        <div className="flex justify-between">
          <span>服務費 10%</span>

          <span className="type-body">NT$ 142</span>
        </div>
      </div>

      {/* 分隔線 */}
      <div className="my-4 border-t border-line" />

      {/* ==================== 合計 ==================== */}
      <div className="flex items-center justify-between">
        <span className="type-body font-bold">合計</span>

        <span className="type-h2 text-brand-600">NT$ 1,562</span>
      </div>

      {/* ==================== 人數 ==================== */}
      <div className="mt-4 flex h-9 items-center justify-between rounded-btn bg-surface-2 px-3">
        <div className="flex items-center gap-2 type-body-sm text-ink-600">
          <span>
            <img src={blackpeople} />
          </span>
          <span>2 大 1 小</span>
        </div>

        <span className="type-caption text-ink-600">均分每人約 NT$ 521</span>
      </div>

      {/* ==================== 會員 ==================== */}
      <div className="mt-3 rounded-btn border border-dashed border-accent-500 p-3">
        {/* 會員標題 */}
        <div className="mb-2 flex items-center justify-between">
          <span className="type-body-sm font-semibold">會員（選填）</span>

          <span className="rounded-pill border border-warning-line bg-accent-100 px-2 py-1 type-caption font-semibold text-hold-ink">
            進階 A1 / A6
          </span>
        </div>

        {/* 電話 */}
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              const value = e.target.value

              if (/^\d*$/.test(value)) {
                setPhone(value)
              }
            }}
            className="h-10.5 min-w-0 flex-1 rounded-btn border border-brand-600 px-3 type-body outline-none focus:ring-1 focus:ring-brand-600"
          />

          <button
            type="button"
            className="h-10.5 w-17.5 rounded-btn border border-brand-600 type-body text-brand-600"
          >
            查詢
          </button>
        </div>

        {/* 會員資料 */}
        <div className="mt-2 rounded-btn bg-surface p-3">
          <div className="flex items-center justify-between">
            <p className="type-h3 font-semibold">陳小美・1998/04/21</p>

            <span className="type-caption text-ink-600">唸給客人確認</span>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className="h-9 flex-1 rounded-btn border border-brand-600 bg-white type-body-sm text-brand-600"
            >
              確認是本人
            </button>

            <button type="button" className="px-2 type-body-sm font-semibold text-ink-600">
              不是
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 收款方式 ==================== */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="type-body-sm text-ink-600">收款方式</span>

          <span className="type-caption text-ink-600">按下後倒數 5 秒才送出</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <PaymentButton>現金</PaymentButton>

          <PaymentButton>信用卡</PaymentButton>

          <PaymentButton>條碼</PaymentButton>
        </div>
      </div>
    </div>
  )
}

function PaymentButton({ children }) {
  return (
    <button
      type="button"
      className="h-12.5 rounded-btn bg-brand-600 type-button text-surface hover:bg-brand-600"
    >
      {children}
    </button>
  )
}
