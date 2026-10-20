import { useState } from 'react'
import { SvgIconMap } from '@/assets/SvgIconMap'

const money = (n) => `NT$ ${Number(n ?? 0).toLocaleString()}`

function OrderRow({ order, isFirst }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={isFirst ? '' : 'border-t border-line'}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center gap-2 py-2 text-left"
      >
        <span className="flex-1 type-h3 text-ink-900 tabular-nums">
          第 {order.sequenceNo} 單 {order.placedAt}
        </span>
        <span className="type-body-sm text-ink-600 tabular-nums">{money(order.total)}</span>
        <SvgIconMap.CardLink
          aria-hidden="true"
          className={`size-4.5 shrink-0 transition-transform ${isOpen ? '-rotate-90' : 'rotate-90'}`}
        />
      </button>

      {isOpen && (
        <ul className="flex flex-col gap-1 pb-3">
          {order.items.map((item) => {
            const specs = [...(item.options ?? []), item.note?.trim() ? `備註：${item.note}` : null]
              .filter(Boolean)
              .join('・')

            return (
              <li key={item.id} className="flex items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="type-body-sm text-ink-900">
                    {item.name} ×{item.quantity}
                  </span>
                  {specs && <span className="type-caption text-ink-600">{specs}</span>}
                </div>
                <span className="type-body-sm text-ink-600 tabular-nums">{money(item.lineTotal)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function OrderMap({ orders = [] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface p-card text-center type-body-sm text-ink-600 shadow-card">
        目前還沒有訂單
      </div>
    )
  }

  return (
    <div className="rounded-card border border-line bg-surface px-card py-2 shadow-card">
      {orders.map((order, index) => (
        <OrderRow key={order.id} order={order} isFirst={index === 0} />
      ))}
    </div>
  )
}
