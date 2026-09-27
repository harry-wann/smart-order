const orders = [
  {
    id: 2,
    status: '製作中',
    time: '18:51',
    total: 460,
    items: [
      {
        name: '安格斯霜降牛五花',
        quantity: 1,
        note: '全份・加蔥花・備註：不要太生',
        status: '製作中',
      },
      {
        name: '白飯',
        quantity: 2,
        note: '免費續加・不扣庫存',
        status: '製作中',
      },
    ],
  },
  {
    id: 1,
    status: '部分出餐',
    time: '18:32',
    total: 960,
    items: [
      {
        name: '招牌麻辣鍋底',
        quantity: 1,
        status: '已出餐',
      },
      {
        name: '伊比利豬梅花',
        quantity: 1,
        status: '已出餐',
      },
      {
        name: '高麗菜',
        quantity: 1,
        status: '製作中',
      },
    ],
  },
]

function StatusBadge({ status }) {
  const isFinished = status === '已出餐'

  return (
    <span
      className={`rounded-full px-3 py-1 text-[10px] ${
        isFinished
          ? 'bg-[#3E8255] text-white'
          : 'border border-[#EBCB98] bg-[#FFF3DF] text-[#9A671C]'
      }`}
    >
      {status}
    </span>
  )
}

function OrderCard({ order }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E6DED2] bg-white shadow-sm">
      {/* 訂單 Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">第 {order.id} 單</h3>

          <span className="rounded-full border border-[#EBCB98] bg-[#FFF3DF] px-2 py-1 text-[10px] text-[#9A671C]">
            {order.status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#8E837B]">{order.time} 送出</span>

          <span className="font-semibold">NT$ {order.total.toLocaleString()}</span>
        </div>
      </div>

      {/* 餐點 */}
      <div>
        {order.items.map((item, index) => (
          <div
            key={`${order.id}-${item.name}`}
            className={`flex items-center justify-between px-4 py-2 ${
              index !== 0 ? 'border-t border-[#EEE7DE]' : ''
            }`}
          >
            <div className="flex min-w-0 items-start gap-3">
              {/* 狀態圓圈 */}
              <span
                className={`mt-1 flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border text-[9px] ${
                  item.status === '已出餐'
                    ? 'border-[#3E8255] text-[#3E8255]'
                    : 'border-[#E99A25] text-[#E99A25]'
                }`}
              >
                {item.status === '已出餐' ? '✓' : '○'}
              </span>

              <div>
                <p className="text-sm font-medium">
                  {item.name} × {item.quantity}
                </p>

                {item.note && <p className="mt-1 text-[11px] text-[#8E837B]">{item.note}</p>}
              </div>
            </div>

            <StatusBadge status={item.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OrderRecord() {
  return (
    <div className="flex h-full min-h-[692px] flex-col">
      {/* 上方 */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">點餐紀錄 {orders.length} 張單</h2>

        <button
          type="button"
          className="h-[40px] rounded-lg border border-[#D74432] px-5 text-sm font-medium text-[#D74432] transition hover:bg-[#FFF1EE]"
        >
          代客加點
        </button>
      </div>

      {/* 訂單列表 */}
      <div className="flex flex-col gap-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {/* 最下面 */}
      <div className="mt-auto flex items-center justify-between rounded-xl border border-[#E6DED2] bg-[#F5F0E8] px-4 py-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">客人沒點餐就離開</p>

            <span className="rounded-full bg-[#ECE6DD] px-2 py-1 text-[10px] text-[#766B63]">
              值店長
            </span>
          </div>

          <p className="mt-1 text-[11px] text-[#8E837B]">
            這桌已經送出退場餐，不能取消，請改用結帳
          </p>
        </div>

        <button
          type="button"
          className="rounded-lg border border-[#E8A38F] px-4 py-2 text-xs text-[#D98A77]"
        >
          取消該次用餐
        </button>
      </div>
    </div>
  )
}
