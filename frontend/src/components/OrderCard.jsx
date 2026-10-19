import { useEffect, useRef, useState } from 'react'
import { SvgIconMap } from '@/assets/SvgIconMap'
import SOButton from './SOButton'

export default function OrderCard({
  ticketId,
  tableNo,
  sequenceNo,
  placedAt,
  orderItems,
  onToggle,
  savingItemIds = [],
  onComplete,
  onCancel,
  isCancelling = false,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!isMenuOpen) return

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsMenuOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  const handleCompleteClick = (e) => {
    e.preventDefault()
    onComplete?.(ticketId)
  }

  const getWaitingMinutes = () => {
    if (!placedAt) return 0
    const diff = Date.now() - new Date(placedAt).getTime()

    return Math.max(0, Math.floor(diff / 60000))
  }

  const waitingMinutes = getWaitingMinutes()

  const isAllServed = orderItems?.length > 0 && orderItems.every((item) => item.status === 'SERVED')

  return (
    <div
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 text-ink-900 shadow-card"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="type-kds-table">{tableNo}</h1>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="訂單操作"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
              className="-translate-y-2 flex h-10 w-10 items-center justify-center rounded-full text-2xl font-normal leading-none text-ink-600 transition-colors hover:bg-paper hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              ⋯
            </button>
            {isMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 w-max rounded-xl border border-line bg-surface p-1.5 shadow-card"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={isCancelling}
                  onClick={() => {
                    setIsMenuOpen(false)
                    onCancel?.(ticketId)
                  }}
                  className="whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-normal text-ink-900 transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  {isCancelling ? '取消中…' : '取消'}
                </button>
              </div>
            )}
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
                    disabled={savingItemIds.includes(item.id)}
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
        onClick={handleCompleteClick}
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
