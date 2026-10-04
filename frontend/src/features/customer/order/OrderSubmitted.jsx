import SOButton from '../../../components/SOButton'

// 原檔名 ordersubmitted.jsx
// 原路徑 src/features/ProductDetail

export default function OrderSubmitted() {
  // 訂單假資料，之後串後端 API 時可以換掉
  const orderItems = [
    {
      id: 1,
      name: '安格斯霜降牛五花',
      quantity: 1,
      options: ['全份', '加蔥花'],
      note: '不要太生',
      status: '製作中',
    },
    {
      id: 2,
      name: '白飯',
      quantity: 2,
      options: [],
      note: '免費續加',
      status: '製作中',
    },
  ]

  return (
    <div className="mx-auto flex min-h-203 w-full max-w-93.75 flex-col self-start bg-surface-2">
      {/* 上方成功內容區：375 × 659 */}
      <main className="flex min-h-164.75 flex-1 flex-col items-center px-6 pt-26.25">
        {/* 成功圖示 */}
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-info-bg">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-14 w-14"
            stroke="#43815C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l4 4L19 6" />
          </svg>
        </div>

        {/* 標題 */}
        <h1 className="mt-7 type-h1 font-bold text-ink-900">第 2 單已送出</h1>

        {/* 說明文字 */}
        <div className="mt-2 text-center type-body-sm text-ink-600">
          <p>廚房已經收到，請稍候。</p>
          <p>同桌其他人的手機也會看到這張單。</p>
        </div>

        {/* 這一單的內容 */}

        <div className="mt-7 w-full rounded-btn border border-line bg-surface px-4 py-3 shadow-sm">
          {/* 卡片標題 */}
          <p className="mb-1 type-caption text-ink-600">這一單的內容</p>

          {/* 訂單商品 */}
          {orderItems.map((item, index) => (
            <div key={item.id}>
              <div className="flex items-start gap-3 py-2">
                {/* 製作狀態 */}
                <span className="rounded-pill border border-warning-line bg-warning-bg px-2 py-1 text-[10px] text-hold-ink">
                  {item.status}
                </span>

                {/* 商品資訊 */}
                <div className="min-w-0 flex-1">
                  {/* 商品名稱 + 數量 */}
                  <div className="flex items-center gap-1">
                    <p className="type-body font-medium text-ink-900">{item.name}</p>

                    <span className="type-body text-ink-900">× {item.quantity}</span>
                  </div>

                  {/* 商品選項 */}
                  {item.options.length > 0 && (
                    <p className="mt-1 type-caption text-ink-600">
                      {item.options.join(' · ')}
                      {item.note && ` · 備註：${item.note}`}
                    </p>
                  )}

                  {/* 沒有 options，但是有 note */}
                  {item.options.length === 0 && item.note && (
                    <p className="mt-1 type-caption text-ink-600">{item.note}</p>
                  )}
                </div>
              </div>

              {/* 商品分隔線 */}
              {index !== orderItems.length - 1 && <div className="ml-14.5 border-b border-line" />}
            </div>
          ))}
        </div>

        {/* 自動跳轉提示 */}
        <p className="mt-5 type-caption text-ink-600">2 秒後自動帶你去看出菜進度</p>
      </main>

      {/* 底部按鈕區：375 × 153 */}
      <footer className="flex h-38.25 shrink-0 flex-col border-t border-line bg-surface px-4 py-4">
        {/* 繼續點餐 */}
        <div className="mt-3">
          <SOButton
            variant="danger"
            height="h-9"
            content={[
              <div key="param-1" className="flex items-center gap-1">
                <span>繼續點餐</span>
              </div>,
            ]}
          />
        </div>

        {/* 查看本桌訂單 */}
        <div className="mt-3">
          <SOButton
            variant="secondary"
            height="h-9"
            content={[
              <div key="param-1" className="flex items-center gap-1">
                <span>查看本桌訂單</span>
              </div>,
            ]}
          />
        </div>
      </footer>
    </div>
  )
}
