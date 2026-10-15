import { SvgIconMap } from '@/assets/SvgIconMap'
import SOButton from '@/components/SOButton'

function StatusBadge({ status }) {
  const isFinished = status === '已出餐'

  return (
    <span
      className={`rounded-pill px-3 py-1 text-[10px] ${
        isFinished ? 'bg-success text-white' : 'border border-warning-line bg-accent-100 text-hold-ink'
      }`}
    >
      {status}
    </span>
  )
}

function OrderCard({ order }) {
  return (
    <div className="overflow-hidden rounded-btn border border-line bg-surface shadow-sm">
      {/* 訂單標題 */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h3>第 {order.sequenceNo} 單</h3>
          <span className="rounded-pill border border-warning-line bg-accent-100 px-2 py-1 text-[10px] text-hold-ink">
            {order.status}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="type-caption text-ink-600">
            {order.time} 送出
          </span>

          <span className="type-body">
            NT$ {Number(order.total).toLocaleString()}
          </span>
        </div>
      </div>

      {/* 餐點清單 */}
      <div>
        {order.items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center justify-between px-4 py-2 ${
              index !== 0 ? 'border-t border-line' : ''
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {item.status === '已出餐' ? (<SvgIconMap.OrderRecordOk />) :
                  (<SvgIconMap.OrderRecordWait />)}

                <p className="type-body font-medium">
                  {item.name} × {item.quantity}
                </p>
              </div>

              {item.note && (
                <p className="mt-1 ml-8 type-caption text-ink-600">
                  {item.note}
                </p>
              )}
            </div>

            <StatusBadge status={item.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OrderRecord({ orders = [], onAddOrder }) {
  return (
    <div className="flex h-full min-h-173 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="type-h3 font-semibold">
          點餐紀錄 {orders.length} 張單
        </h2>

        <div className="w-26.2">
          <SOButton
            variant="secondary"
            onClick={onAddOrder}
            content={[
              <div key="add-order" className="flex w-full items-center gap-1">
                <span className="type-body font-bold">代客加點</span>
              </div>,
            ]}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {orders.length === 0 ? (
          <p className="rounded-btn border border-line p-6 text-center text-ink-600">
            沒有點餐紀錄
          </p>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </div>
    </div>
  )
}