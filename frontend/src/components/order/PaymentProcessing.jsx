import { useEffect, useState } from 'react'

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
    // =========================
    // 背景遮罩
    // =========================
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35">
      {/* =========================
          付款 Modal
      ========================== */}
      <div className="w-[440px] rounded-[10px] bg-white px-8 pt-9 pb-8 shadow-lg">
        {/* 桌號 */}
        <div className="flex items-center justify-center gap-2 text-[12px] text-[#756A63]">
          {/* 信用卡小圖示 */}
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="3"
              y="6"
              width="18"
              height="12"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" />
          </svg>

          <span>A03 桌・櫃檯結帳</span>
        </div>

        {/* 標題 */}
        <h2 className="mt-3 text-center text-[24px] font-bold text-[#2B211C]">信用卡付款中</h2>

        {/* =========================
            倒數圓圈
        ========================== */}
        <div className="mt-6 flex justify-center">
          <div className="relative flex h-[104px] w-[104px] items-center justify-center">
            {/* 淺色底圓 */}
            <div className="absolute inset-0 rounded-full border-[6px] border-[#F8DFDA]" />

            {/* 上方紅線 */}
            <div className="absolute top-0 left-1/2 h-[6px] w-[37px] -translate-x-1/2 rounded-full bg-[#D74432]" />

            {/* 左側紅線 */}
            <div className="absolute top-1/2 left-0 h-[37px] w-[6px] -translate-y-1/2 rounded-full bg-[#D74432]" />

            {/* 右側紅線 */}
            <div className="absolute top-1/2 right-0 h-[37px] w-[6px] -translate-y-1/2 rounded-full bg-[#D74432]" />

            {/* 下方紅線 */}
            <div className="absolute bottom-0 left-1/2 h-[6px] w-[37px] -translate-x-1/2 rounded-full bg-[#D74432]" />

            {/* 倒數數字 */}
            <span className="relative text-[58px] leading-none font-bold text-[#D74432]">
              {countdown}
            </span>
          </div>
        </div>

        {/* 倒數提示 */}
        <p className="mt-4 text-center text-[12px] text-[#756A63]">
          秒後送出，按錯付款方式請按取消
        </p>

        {/* =========================
            金額
        ========================== */}
        <div className="mt-4 text-center">
          <p className="text-[27px] leading-none font-bold text-[#2B211C]">
            NT$ {total.toLocaleString()}
          </p>

          <p className="mt-2 text-[11px] text-[#756A63]">
            小計 {subtotal.toLocaleString()}＋服務費 {serviceFee.toLocaleString()}
          </p>
        </div>

        {/* =========================
            系統提示
        ========================== */}
        <div className="mx-auto mt-6 flex h-[46px] max-w-[360px] items-center rounded-[8px] bg-[#F5F0E8] px-4">
          {/* Info icon */}
          <div className="mr-3 flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border border-[#8D8178] text-[10px] text-[#8D8178]">
            i
          </div>

          <p className="text-[12px] text-[#756A63]">本系統為教學專題，付款為模擬流程</p>
        </div>

        {/* =========================
            取消
        ========================== */}
        <button
          type="button"
          onClick={onCancel}
          className="mt-6 w-full cursor-pointer text-center text-[15px] text-[#5A4B43] hover:text-[#D74432]"
        >
          取消
        </button>
      </div>
    </div>
  )
}
