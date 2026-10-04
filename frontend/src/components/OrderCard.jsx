import { SvgIconMap } from '@/assets/SvgIconMap'
import SOButton from './SOButton'
import Badge from '../components/Badge'

export default function OrderCard({
  tableNo,
  sequenceNo,
  isPreorder,
  placedAt,
  orderItems,
  onToggle,
  onComplete,
}) {
  const handleCompleteClick = (e) => {
    console.log(e)
    onComplete?.(tableNo, sequenceNo, placedAt, orderItems)
  }

  const getWaitingMinutes = () => {
    if (!placedAt) return 0
    const diff = Date.now() - new Date(placedAt).getTime()
    console.log(diff)

    return Math.max(0, Math.floor(diff / 60000))
  }

  const waitingMinutes = getWaitingMinutes()

  const isAllServed = orderItems?.length > 0 && orderItems.every((item) => item.status === 'SERVED')

  const borderColor = isPreorder == true ? 'border-accent-500' : 'border-line'
  return (
    <div
      className={`flex flex-col gap-4 rounded-card border ${borderColor} bg-surface p-5 text-ink-900 shadow-card`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="type-kds-table">{tableNo}</h1>
          <div className="origin-right scale-55">
            {isPreorder == true && <Badge text="預約優先" col="pri" />}
          </div>
        </div>

        <div className="flex items-center justify-between text-ink-600">
          <p>第{sequenceNo}單</p>
          <p className="flex items-center gap-1">
            <SvgIconMap.CartTime role="img" aria-label="time icon" className="svg-icon" />
            <span>{waitingMinutes} 分</span>
          </p>
        </div>
      </div>

      <hr className="border-line" />

      <div className="mb-2 flex flex-col gap-1">
        {Array.isArray(orderItems) &&
          orderItems.map((item) => {
            const isCompleted = item.status === 'SERVED'

            return (
              <label key={item.id} className="flex cursor-pointer items-center gap-2">
                <div className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={isCompleted}
                    onChange={() => onToggle(item.id)}
                  />
                  <div className="absolute inset-0 rounded-(--radius-check) border-2 border-ink-400 bg-transparent transition-colors peer-checked:border-success peer-checked:bg-success"></div>
                  <SvgIconMap.CardCheck
                    role="img"
                    aria-label="check"
                    className="relative z-10 h-3.5 w-3.5 opacity-0 transition-opacity peer-checked:opacity-100"
                  />
                </div>
                <div className={`type-h3 ${isCompleted ? 'text-ink-400 line-through' : ''}`}>
                  <p className="type-h3">
                    {item.itemNameSnapshot} ×{item.quantity}
                  </p>
                  <p className={`type-body-sm ${isCompleted ? '' : 'text-ink-600'}`}>{item.optionsSummary}</p>
                </div>
              </label>
            )
          })}
      </div>

      <SOButton
        height="h-11"
        disabled={!isAllServed}
        content={[
          <div key="btn-content" className="flex items-center justify-center gap-2">
            <SvgIconMap.CardCheck />
            <span>整單出完</span>
          </div>,
        ]}
      />
    </div>
  )
}
