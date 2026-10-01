import '../features/admin/kds/kds.colors.css'
import time from '../assets/ic_cart_time.svg'
import check from '../assets/ic_card_check.svg'
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

  const isPreorderTheme = isPreorder == true ? 'border border-(--color-accent-500)' : ''
  return (
    <div className="kds">
      <div
        className={`flex flex-col gap-4 rounded-(--radius-card) ${isPreorderTheme} bg-(--kds-card) p-5`}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="type-kds-table">{tableNo}</h1>
            <div className="origin-right scale-55">
              {isPreorderTheme && <Badge text="預約優先" col="pri" />}
            </div>
          </div>

          <div className="flex items-center justify-between text-(--kds-ink-2)">
            <p>第{sequenceNo}單</p>
            <p className="flex items-center gap-1">
              <img src={time} alt="time icon" />
              <span>{waitingMinutes} 分</span>
            </p>
          </div>
        </div>

        <hr className="text-(--kds-ink-3) opacity-30" />

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
                    <div className="absolute inset-0 rounded-(--radius-check) border-2 border-(--kds-ink-3) bg-transparent transition-colors peer-checked:border-(--kds-boxok) peer-checked:bg-(--kds-boxok)"></div>
                    <img
                      src={check}
                      alt="check"
                      className="relative z-10 h-3.5 w-3.5 opacity-0 transition-opacity peer-checked:opacity-100"
                    />
                  </div>
                  <div className={`type-h3 ${isCompleted ? 'text-gray-400 line-through' : ''}`}>
                    <p className="type-h3">
                      {item.itemNameSnapshot} ×{item.quantity}
                    </p>
                    <p className="type-body-sm">{item.optionsSummary}</p>
                  </div>
                </label>
              )
            })}
        </div>

        <SOButton
          disabled={!isAllServed}
          content={[
            <div key="btn-content" className="flex items-center justify-center gap-2">
              <img src={check} />
              <span>整單出完</span>
            </div>,
          ]}
        />
      </div>
    </div>
  )
}
