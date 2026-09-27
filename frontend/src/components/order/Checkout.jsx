import { useState } from 'react'

export default function Checkout() {
  const [phone, setPhone] = useState('0912345678')

  return (
    <div className="w-full rounded-xl border border-[#E6DED2] bg-white p-5 shadow-sm">
      {/* ==================== 標題 ==================== */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">結帳</h2>

        <span className="text-[11px] text-[#8E837B]">客人到櫃檯付款</span>
      </div>

      {/* ==================== 金額 ==================== */}
      <div className="mt-4 space-y-4 text-sm">
        <div className="flex justify-between">
          <span>小計 6 項</span>

          <span className="font-medium">NT$ 1,420</span>
        </div>

        <div className="flex justify-between">
          <span>服務費 10%</span>

          <span className="font-medium">NT$ 142</span>
        </div>
      </div>

      {/* 分隔線 */}
      <div className="my-4 border-t border-[#E6DED2]" />

      {/* ==================== 合計 ==================== */}
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">合計</span>

        <span className="text-[28px] leading-none font-semibold text-[#D74432]">NT$ 1,562</span>
      </div>

      {/* ==================== 人數 ==================== */}
      <div className="mt-4 flex h-[36px] items-center justify-between rounded-lg bg-[#F5F0E8] px-3">
        <div className="flex items-center gap-2 text-xs text-[#6F655E]">
          <span>♙</span>
          <span>2 大 1 小</span>
        </div>

        <span className="text-[11px] text-[#8E837B]">均分每人約 NT$ 521</span>
      </div>

      {/* ==================== 會員 ==================== */}
      <div className="mt-3 rounded-xl border border-dashed border-[#E8A458] p-3">
        {/* 會員標題 */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium">會員（選填）</span>

          <span className="rounded-full border border-[#E7B86A] bg-[#FFF6E7] px-2 py-1 text-[10px] text-[#9A671C]">
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
            className="h-[42px] min-w-0 flex-1 rounded-lg border border-[#D74432] px-3 text-sm outline-none focus:ring-1 focus:ring-[#D74432]"
          />

          <button
            type="button"
            className="h-[42px] w-[70px] rounded-lg border border-[#D74432] text-sm font-medium text-[#D74432]"
          >
            查詢
          </button>
        </div>

        {/* 會員資料 */}
        <div className="mt-2 rounded-lg bg-[#F8F1E7] p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">陳小美・1998/04/21</p>

            <span className="text-[10px] text-[#8E837B]">姓名客人確認</span>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className="h-[36px] flex-1 rounded-lg border border-[#D74432] bg-white text-xs font-medium text-[#D74432]"
            >
              確認是本人
            </button>

            <button type="button" className="px-2 text-xs text-[#6F655E]">
              不是
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 收款方式 ==================== */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium">收款方式</span>

          <span className="text-[10px] text-[#8E837B]">按下後倒數 5 秒才送出</span>
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
      className="h-[50px] rounded-lg bg-[#D74432] text-base font-semibold text-white transition hover:bg-[#C43C2D] active:scale-[0.98]"
    >
      {children}
    </button>
  )
}
