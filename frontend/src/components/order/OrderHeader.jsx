export default function OrderHeader() {
  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-[#E6DED2] bg-white px-7">
      {/* 左邊 */}
      <div className="flex items-center gap-4">
        {/* 返回 */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center text-xl text-[#2B211C]"
        >
          ‹
        </button>

        {/* 桌號 */}
        <h2 className="text-[20px] font-semibold">A03 桌</h2>

        {/* 桌型 */}
        <span className="rounded-full bg-[#F3EFE8] px-3 py-1 text-[11px] text-[#776C64]">
          4 人桌・窗邊區
        </span>

        {/* 狀態 */}
        <span className="rounded-full bg-[#F0A92E] px-3 py-1 text-[11px] font-medium text-[#493216]">
          用餐中
        </span>
      </div>

      {/* 右邊 */}
      <div className="flex items-center gap-5">
        <span className="text-xs text-[#8E837B]">18:32 入座・已 47 分鐘</span>

        {/* 通知 */}
        <button type="button" className="relative flex h-9 w-9 items-center justify-center">
          <span className="text-[22px]">♧</span>

          <span className="absolute top-[3px] right-[4px] h-2 w-2 rounded-full bg-[#C52B25]" />
        </button>
      </div>
    </header>
  )
}
