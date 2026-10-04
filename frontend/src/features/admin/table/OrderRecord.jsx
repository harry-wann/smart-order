import { SvgIconMap } from '@/assets/SvgIconMap'
import SOButton from '../../../components/SOButton'

// 原路徑 src/features/order-checkbill

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
      className={`rounded-pill px-3 py-1 text-[10px] ${
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
    <div className="overflow-hidden rounded-btn border border-line bg-surface shadow-sm">
      {/* 訂單 Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h3>第 {order.id} 單</h3>

          <span className="rounded-pill border border-warning-line bg-accent-100 px-2 py-1 text-[10px] text-hold-ink">
            {order.status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="type-caption text-ink-600">{order.time} 送出</span>

          <span className="type-body">NT$ {order.total.toLocaleString()}</span>
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
            <div>
              {/* icon + 商品名稱 */}
              <div className="flex items-center gap-2">
                {item.status === '已出餐' ? <SvgIconMap.OrderRecordOk /> : <SvgIconMap.OrderRecordWait />}

                <p className="type-body font-medium">
                  {item.name} × {item.quantity}
                </p>
              </div>

              {/* 備註 */}
              {item.note && <p className="mt-1 ml-8 type-caption text-ink-600">{item.note}</p>}
            </div>

            {/* 出餐狀態 */}
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
        <div className="w-26.2">
          <SOButton
            variant="secondary"
            content={[
              <div key="param-2" className="flex w-full items-center gap-1">
                <span className="type-body font-bold">代客加點</span>
              </div>,
            ]}
          />
        </div>
      </div>

      {/* 訂單列表 */}
      <div className="flex flex-col gap-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}
