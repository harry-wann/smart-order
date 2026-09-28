export default function OrderHeader() {
  return (
    <header className="flex h-15 items-center justify-between border-b border-line bg-surface px-7">
      {/* 左邊 */}
      <div className="flex items-center gap-4">
        {/* 返回 */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center type-h2 text-ink-900"
        >
          ‹
        </button>

        {/* 桌號 */}
        <h2 className="type-h2 font-semibold">A03 桌</h2>

        {/* 桌型 */}
        <span className="rounded-pill border border-line bg-surface-2 px-3 py-1 type-caption text-ink-600">
          4 人桌・窗邊區
        </span>

        {/* 狀態 */}
        <span className="rounded-pill bg-accent-500 px-3 py-1 type-caption font-medium text-ink-900">
          用餐中
        </span>
      </div>

      {/* 右邊 */}
      <div className="flex items-center gap-5">
        <span className="type-caption text-ink-600">18:32 入座・已 47 分鐘</span>

        {/* 通知 */}
        <button type="button" className="relative flex h-9 w-9 items-center justify-center">
          <span className="type-h2">人</span>

          <span className="absolute top-0.75 right-1 h-2 w-2 rounded-pill bg-[#C52B25]" />
        </button>
      </div>
    </header>
  )
}
