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
          ? 'bg-success text-white'
          : 'border border-warning-line bg-accent-100 text-hold-ink'
      }`}
    >
      {status}
    </span>
  )
}

function OrderCard({ order }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      {/* 訂單 Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">第 {order.id} 單</h3>

          <span className="rounded-pill border border-warning-line bg-accent-100 px-2 py-1 text-[10px] text-hold-ink">
            {order.status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="type-caption text-ink-600">{order.time} 送出</span>

          <span className="type-body font-semibold">NT$ {order.total.toLocaleString()}</span>
        </div>
      </div>

      {/* 餐點 */}
      <div>
        {order.items.map((item, index) => (
          <div
            key={`${order.id}-${item.name}`}
            className={`flex items-center justify-between px-4 py-2 ${
              index !== 0 ? 'border-t border-line' : ''
            }`}
          >
            <div className="flex min-w-0 items-start gap-3">
              {/* 狀態圓圈 */}
              {/* <span
                className={`mt-1 flex h-4 w-4 items-center justify-center rounded-pill border type-caption ${
                  item.status === '已出餐'
                    ? 'border-success text-success'
                    : 'border-warning-line text-hold-ink'
                }`}
              >
                {item.status === '已出餐' ? '✓' : '○'}
              </span> */}

              <div>
                <p className="type-body font-medium">
                  {item.name} × {item.quantity}
                </p>

                {item.note && <p className="mt-1 type-caption text-ink-600">{item.note}</p>}
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
    <div className="flex h-full min-h-173 flex-col">
      {/* 上方 */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="type-h3 font-semibold">點餐紀錄 {orders.length} 張單</h2>

        <button
          type="button"
          className="h-10 rounded-btn border border-brand-600 px-5 type-body font-medium text-brand-600 hover:bg-surface"
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
      <div className="mt-auto flex items-center justify-between rounded-btn border border-line bg-surface px-4 py-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="type-body font-semibold">客人沒點餐就離開</p>

            <span className="rounded-pill border border-line bg-surface-2 px-2 py-1 type-caption text-ink-600">
              僅店長
            </span>
          </div>

          <p className="mt-1 type-caption text-ink-600">這桌已經送出過點餐，不能取消，請改用結帳</p>
        </div>

        <button
          type="button"
          className="rounded-btn border border-brand-600 px-4 py-2 text-xs text-brand-600"
        >
          取消該次用餐
        </button>
      </div>
    </div>
  )
}
