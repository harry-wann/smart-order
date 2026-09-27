export default function OrderSubmitted() {
  // =========================
  // 訂單假資料
  // 之後串後端 API 時可以換掉
  // =========================
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
    <div className="mx-auto flex min-h-[812px] w-full max-w-[375px] flex-col bg-[#F8F4EC]">
      {/* ======================================== */}
      {/* 上方成功內容區：375 × 659 */}
      {/* ======================================== */}
      <main className="flex min-h-[659px] flex-1 flex-col items-center px-6 pt-[105px]">
        {/* ====================================== */}
        {/* 成功圖示 */}
        {/* ====================================== */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E2EFE8]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-7 w-7"
            stroke="#43815C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l4 4L19 6" />
          </svg>
        </div>

        {/* ====================================== */}
        {/* 標題 */}
        {/* ====================================== */}
        <h1 className="mt-7 text-xl font-bold text-[#2B211C]">第 2 單已送出</h1>

        {/* ====================================== */}
        {/* 說明文字 */}
        {/* ====================================== */}
        <div className="mt-2 text-center text-xs leading-5 text-[#756A63]">
          <p>廚房已經收到，請稍候。</p>

          <p>同桌其他人的手機也會看到這張單。</p>
        </div>

        {/* ====================================== */}
        {/* 這一單的內容 */}
        {/* ====================================== */}
        <div className="mt-7 w-full rounded-xl border border-[#E6DED2] bg-white px-4 py-3 shadow-sm">
          {/* 卡片標題 */}
          <p className="mb-1 text-xs text-[#756A63]">這一單的內容</p>

          {/* 訂單商品 */}
          {orderItems.map((item, index) => (
            <div key={item.id}>
              <div className="flex items-start gap-3 py-2">
                {/* ============================== */}
                {/* 製作狀態 */}
                {/* ============================== */}
                <span className="shrink-0 rounded-full border border-[#E6A54A] bg-[#FFF4DF] px-2 py-1 text-[10px] leading-3 text-[#B7771C]">
                  {item.status}
                </span>

                {/* ============================== */}
                {/* 商品資訊 */}
                {/* ============================== */}
                <div className="min-w-0 flex-1">
                  {/* 商品名稱 + 數量 */}
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-[#2B211C]">{item.name}</p>

                    <span className="text-sm text-[#2B211C]">× {item.quantity}</span>
                  </div>

                  {/* 商品選項 */}
                  {item.options.length > 0 && (
                    <p className="mt-1 text-xs text-[#756A63]">
                      {item.options.join(' · ')}
                      {item.note && ` · 備註：${item.note}`}
                    </p>
                  )}

                  {/* 沒有 options，但是有 note */}
                  {item.options.length === 0 && item.note && (
                    <p className="mt-1 text-xs text-[#756A63]">{item.note}</p>
                  )}
                </div>
              </div>

              {/* ============================== */}
              {/* 商品分隔線 */}
              {/* ============================== */}
              {index !== orderItems.length - 1 && (
                <div className="ml-[58px] border-b border-[#E6DED2]" />
              )}
            </div>
          ))}
        </div>

        {/* ====================================== */}
        {/* 自動跳轉提示 */}
        {/* ====================================== */}
        <p className="mt-5 text-xs text-[#756A63]">2 秒後自動帶你去看出菜進度</p>
      </main>

      {/* ======================================== */}
      {/* 底部按鈕區：375 × 153 */}
      {/* ======================================== */}
      <footer className="flex h-[153px] shrink-0 flex-col border-t border-[#E6DED2] bg-white px-4 py-4">
        {/* 繼續點餐 */}
        <button
          type="button"
          className="flex h-12 w-full shrink-0 items-center justify-center rounded-lg bg-[#D74432] text-base font-bold text-white"
        >
          繼續點餐
        </button>

        {/* 查看本桌訂單 */}
        <button
          type="button"
          className="mt-3 flex h-12 w-full shrink-0 items-center justify-center rounded-lg border border-[#D74432] bg-white text-base font-bold text-[#D74432]"
        >
          查看本桌訂單
        </button>
      </footer>
    </div>
  )
}
