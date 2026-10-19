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
  onCancelItems,
  isCancelling = false,
  isCancellingItem = false,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isCancelItemsDialogOpen, setIsCancelItemsDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [selectedCancelItemId, setSelectedCancelItemId] = useState(null)
  const [cancelItemReason, setCancelItemReason] = useState('')
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

  const handleCancelSubmit = async (event) => {
    event.preventDefault()
    const cancelled = await onCancel?.(ticketId, cancelReason.trim())
    if (cancelled) {
      setIsCancelDialogOpen(false)
      setCancelReason('')
    }
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
                className="absolute right-0 top-full z-20 mt-1 w-32 rounded-xl border border-line bg-surface p-1.5 shadow-card"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={isCancelling}
                  onClick={() => {
                    setIsMenuOpen(false)
                    setIsCancelDialogOpen(true)
                  }}
                  className="w-full whitespace-nowrap rounded-lg px-0 py-2 text-left text-sm font-normal text-ink-900 transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-brand-600 sm:px-3.5 md:px-5"
                >
                  {isCancelling ? '取消中…' : '取消訂單'}
                </button>
                <div role="separator" className="mx-2 border-t border-line" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false)
                    setSelectedCancelItemId(null)
                    setCancelItemReason('')
                    setIsCancelItemsDialogOpen(true)
                  }}
                  className="w-full whitespace-nowrap rounded-lg px-0 py-2 text-left text-sm font-normal text-ink-900 transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:outline-brand-600 sm:px-3.5 md:px-5"
                >
                  取消細項
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
                    onChange={() => onToggle(item.id, !isCompleted)}
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
                  <p className={`type-body-sm ${isCompleted ? '' : 'text-ink-600'}`}>
                    {item.optionsSummary}
                    {item.note != null && item.note !== '' && `${item.optionsSummary ? '、' : ''}${item.note}`}
                  </p>
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

      {isCancelDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCancelling) setIsCancelDialogOpen(false)
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby={`cancel-ticket-title-${ticketId}`}
            onSubmit={handleCancelSubmit}
            className="w-full max-w-md rounded-card bg-surface p-6 text-ink-900 shadow-card"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id={`cancel-ticket-title-${ticketId}`} className="type-h2">取消訂單</h2>
              <div className="w-9">
                <SOButton
                  type="button"
                  variant="ghost"
                  height="h-9"
                  aria-label="關閉"
                  disabled={isCancelling}
                  onClick={() => setIsCancelDialogOpen(false)}
                  content="×"
                />
              </div>
            </div>
            <label htmlFor={`cancel-ticket-reason-${ticketId}`} className="mb-2 block text-sm font-medium text-ink-700">
              取消理由
            </label>
            <textarea
              id={`cancel-ticket-reason-${ticketId}`}
              name="cancel_reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={4}
              maxLength={100}
              placeholder="請輸入取消理由"
              className="w-full resize-y rounded-lg border border-line bg-surface p-3 text-sm text-ink-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
            />
            <div className="mt-5 flex justify-end">
              <div className="w-28">
                <SOButton
                  type="submit"
                  variant="danger"
                  height="h-11"
                  disabled={isCancelling || !cancelReason.trim()}
                  content={isCancelling ? '取消中…' : '確定'}
                />
              </div>
            </div>
          </form>
        </div>
      )}

      {isCancelItemsDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCancellingItem) setIsCancelItemsDialogOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`cancel-items-title-${ticketId}`}
            className="w-full max-w-md rounded-card bg-surface p-6 text-ink-900 shadow-card"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id={`cancel-items-title-${ticketId}`} className="type-h2">取消細項</h2>
              <div className="w-9">
                <SOButton
                  type="button"
                  variant="ghost"
                  height="h-9"
                  aria-label="關閉"
                  disabled={isCancellingItem}
                  onClick={() => setIsCancelItemsDialogOpen(false)}
                  content="×"
                />
              </div>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {orderItems.map((item) => {
                const isSelected = selectedCancelItemId === item.id
                return (
                  <div key={item.id} className="rounded-lg border border-line p-3">
                    <button
                      type="button"
                      aria-expanded={isSelected}
                      onClick={() => {
                        setSelectedCancelItemId(isSelected ? null : item.id)
                        setCancelItemReason('')
                      }}
                      className={`w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-paper ${
                        isSelected ? 'bg-paper' : ''
                      }`}
                    >
                      <span className="block text-sm font-medium text-ink-900">
                        {item.itemNameSnapshot} ×{item.quantity}
                      </span>
                      {item.optionsSummary && (
                        <span className="mt-1 block text-sm text-ink-600">{item.optionsSummary}</span>
                      )}
                    </button>
                    {isSelected && (
                      <div className="mt-3 border-t border-line pt-3">
                        <label
                          htmlFor={`cancel-item-reason-${item.id}`}
                          className="mb-2 block text-sm font-medium text-ink-700"
                        >
                          取消理由
                        </label>
                        <textarea
                          id={`cancel-item-reason-${item.id}`}
                          name="cancel_reason"
                          value={cancelItemReason}
                          onChange={(event) => setCancelItemReason(event.target.value)}
                          rows={3}
                          maxLength={100}
                          placeholder="請輸入取消理由"
                          className="w-full resize-y rounded-lg border border-line bg-surface p-3 text-sm text-ink-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {selectedCancelItemId !== null && (
              <div className="mt-5 flex justify-end">
                <div className="w-28">
                  <SOButton
                    type="button"
                    variant="danger"
                    height="h-11"
                    disabled={isCancellingItem || !cancelItemReason.trim()}
                    onClick={async () => {
                      const cancelled = await onCancelItems?.(selectedCancelItemId, cancelItemReason.trim())
                      if (cancelled) {
                        setIsCancelItemsDialogOpen(false)
                        setSelectedCancelItemId(null)
                        setCancelItemReason('')
                      }
                    }}
                    content={isCancellingItem ? '取消中…' : '確定'}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
