import { useEffect, useRef, useState } from 'react'
import { SvgIconMap } from '@/assets/SvgIconMap'
import SOButton from './SOButton'

// 出菜看板（S-04）的一張點餐單卡片，只用在深色的 KitchenOverview（顏色來自 kds.colors.css 的 --kds-*）

// 等待超過 15 分鐘就是久候（M4 4.6）：邊框變紅、時間閃爍
const LATE_AFTER_MS = 15 * 60 * 1000

// 細項操作的文案。取消只限還沒出餐的品項（庫存補回）；報廢已出、未出都可以（做壞或客人退回，庫存不補回）。
// 兩種都不計入帳單
const ITEM_ACTIONS = {
  cancel: {
    title: '取消細項',
    hint: '還沒出餐的品項才能取消，庫存會補回，不計入帳單。',
    empty: '沒有可以取消的品項；已出餐的請改用「報廢細項」。',
    reasonLabel: '取消理由',
    placeholder: '請輸入取消理由',
    submit: '確定取消',
    pending: '取消中…',
  },
  waste: {
    title: '報廢細項',
    hint: '做壞或客人退回的餐點，庫存不補回，不計入帳單。',
    empty: '沒有可以報廢的品項。',
    reasonLabel: '報廢原因',
    placeholder: '例如：煮過頭、掉到地上、客人退回',
    submit: '確定報廢',
    pending: '報廢中…',
  },
}

const reasonFieldClass =
  'w-full resize-y rounded-(--radius-btn) border border-[var(--kds-box)] bg-[var(--kds-bg)] p-3 type-body text-[var(--kds-ink)] outline-none transition-colors placeholder:text-[var(--kds-ink-3)] focus:border-[var(--kds-ink-2)]'

const menuItemClass =
  'flex min-h-11 w-full items-center rounded-lg px-3 text-left type-body whitespace-nowrap text-[var(--kds-ink)] transition-colors hover:bg-[var(--kds-line)] focus-visible:outline-2 focus-visible:outline-[var(--kds-ink)] disabled:opacity-40'

function itemDetail(item) {
  return [item.optionsSummary, item.note?.trim()].filter(Boolean).join('・')
}

// 深色的對話框外框。放在元件外面：看板每秒更新時鐘，寫在 OrderCard 裡面會每秒重建、輸入框失去焦點
function KdsDialog({ titleId, title, busy, onClose, onSubmit, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-card border border-[var(--kds-line)] bg-[var(--kds-card)] p-6 text-[var(--kds-ink)] shadow-pop"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="type-h2">{title}</h2>
          <button
            type="button"
            aria-label="關閉"
            disabled={busy}
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full text-2xl leading-none text-[var(--kds-ink-2)] transition-colors hover:bg-[var(--kds-line)] hover:text-[var(--kds-ink)] focus-visible:outline-2 focus-visible:outline-[var(--kds-ink)] disabled:opacity-40"
          >
            ×
          </button>
        </div>
        {children}
      </form>
    </div>
  )
}

export default function OrderCard({
  ticketId,
  tableNo,
  sequenceNo,
  placedAt,
  orderItems,
  now,
  onToggle,
  savingItemIds = [],
  onComplete,
  isCompleting = false,
  onCancel,
  isCancelling = false,
  onCancelItem,
  onWasteItem,
  isItemActionPending = false,
  isLeaving = false,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  // 'cancel'＝取消細項、'waste'＝報廢細項、null＝沒開
  const [itemAction, setItemAction] = useState(null)
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [itemReason, setItemReason] = useState('')
  const [itemActionError, setItemActionError] = useState('')
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

  // now 由看板每秒更新，等待分鐘與久候警示跟著時鐘走，不用等新資料
  const waitingMs = placedAt ? Math.max(0, now - new Date(placedAt).getTime()) : 0
  const waitingMinutes = Math.floor(waitingMs / 60000)
  const isLate = waitingMs > LATE_AFTER_MS

  const openCancelTicket = () => {
    setIsMenuOpen(false)
    setCancelError('')
    setIsCancelDialogOpen(true)
  }

  const handleCancelSubmit = async (event) => {
    event.preventDefault()
    if (!cancelReason.trim()) return
    const error = await onCancel?.(ticketId, cancelReason.trim())
    if (error) {
      setCancelError(error)
      return
    }
    setIsCancelDialogOpen(false)
    setCancelReason('')
  }

  const openItemAction = (action) => {
    setIsMenuOpen(false)
    setSelectedItemId(null)
    setItemReason('')
    setItemActionError('')
    setItemAction(action)
  }

  const closeItemAction = () => {
    setItemAction(null)
    setSelectedItemId(null)
    setItemReason('')
    setItemActionError('')
  }

  const handleItemActionSubmit = async (event) => {
    event.preventDefault()
    if (selectedItemId === null || !itemReason.trim()) return
    const run = itemAction === 'waste' ? onWasteItem : onCancelItem
    const error = await run?.(selectedItemId, itemReason.trim())
    if (error) {
      setItemActionError(error)
      return
    }
    closeItemAction()
  }

  const action = itemAction ? ITEM_ACTIONS[itemAction] : null
  // 已出餐的品項不能取消（只能報廢）
  const actionItems = itemAction === 'cancel' ? orderItems.filter((item) => item.status !== 'SERVED') : orderItems

  return (
    <article
      aria-label={`${tableNo} 第 ${sequenceNo} 單`}
      aria-hidden={isLeaving || undefined}
      className={`flex flex-col gap-4 rounded-card border-2 bg-[var(--kds-card)] p-5 text-[var(--kds-ink)] motion-safe:transition-all motion-safe:duration-500 ${
        isLate ? 'border-danger' : 'border-transparent'
      } ${isLeaving ? 'pointer-events-none scale-95 opacity-0' : 'opacity-100'}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 className="type-kds-table">{tableNo}</h2>
          {isLate && (
            <span className="rounded-pill bg-danger px-3 py-0.5 type-body-sm font-bold text-surface">久候</span>
          )}
          <span className="flex-1" />
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="訂單操作"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              disabled={isLeaving}
              onClick={() => setIsMenuOpen((open) => !open)}
              className="flex size-11 items-center justify-center rounded-full text-2xl leading-none text-[var(--kds-ink-2)] transition-colors hover:bg-[var(--kds-line)] hover:text-[var(--kds-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kds-ink)]"
            >
              ⋯
            </button>
            {isMenuOpen && (
              <div
                role="menu"
                className="absolute top-full right-0 z-20 mt-1 w-36 rounded-xl border border-[var(--kds-line)] bg-[var(--kds-topbar)] p-1.5 shadow-pop"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={isCancelling}
                  onClick={openCancelTicket}
                  className={menuItemClass}
                >
                  {isCancelling ? '取消中…' : '取消訂單'}
                </button>
                <div role="separator" className="mx-2 my-1 border-t border-[var(--kds-line)]" />
                <button type="button" role="menuitem" onClick={() => openItemAction('cancel')} className={menuItemClass}>
                  取消細項
                </button>
                <button type="button" role="menuitem" onClick={() => openItemAction('waste')} className={menuItemClass}>
                  報廢細項
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between type-body text-[var(--kds-ink-2)]">
          <span>第 {sequenceNo} 單</span>
          <span
            className={`flex items-center gap-1 ${isLate ? 'font-bold text-[var(--kds-late)] motion-safe:animate-pulse' : ''}`}
          >
            <SvgIconMap.CartTime aria-hidden="true" className="svg-icon size-5" />
            <span>
              {waitingMinutes} 分{isLate && <span className="sr-only">，已超過 15 分鐘</span>}
            </span>
          </span>
        </div>
      </div>

      <hr className="border-[var(--kds-line)]" />

      {/* 品項順序由後端排好：鍋底 → 菜盤 → 肉品（M4 4.7） */}
      <ul className="flex flex-col gap-4">
        {orderItems.map((item) => {
          const isServed = item.status === 'SERVED'
          const isSaving = savingItemIds.includes(item.id)
          const detail = itemDetail(item)

          return (
            <li key={item.id}>
              {/* 整列都是勾選的點擊範圍，勾選框本身 40×40（M4 4.3） */}
              <label className={`flex items-start gap-4 ${isSaving ? 'cursor-wait' : 'cursor-pointer'}`}>
                <span className="relative flex size-10 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={isServed}
                    disabled={isSaving || isLeaving}
                    onChange={() => onToggle(item.id, !isServed)}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-(--radius-check) border-2 border-[var(--kds-box)] transition-colors peer-checked:border-success peer-checked:bg-success peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--kds-ink)] peer-disabled:opacity-60"
                  />
                  <SvgIconMap.CardCheck
                    aria-hidden="true"
                    className="relative h-4 w-5.5 opacity-0 transition-opacity peer-checked:opacity-100"
                  />
                </span>
                <span className={`flex min-w-0 flex-1 flex-col pt-0.5 ${isServed ? 'opacity-50' : ''}`}>
                  <span className={`type-kds-item ${isServed ? 'line-through' : ''}`}>
                    {item.itemNameSnapshot} ×{item.quantity}
                  </span>
                  {detail && <span className="type-body text-[var(--kds-ink-3)]">{detail}</span>}
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      {/* 整單出完：把還沒出的品項一次標成已出餐，後端再推導出整張單完成。
          品項都勾了但卡片還在（例如最後一項是被取消掉的）時也可以按，用來收掉這張卡 */}
      <button
        type="button"
        disabled={isCompleting || isLeaving}
        onClick={() => onComplete?.(ticketId)}
        className="mt-1 flex h-13 w-full items-center justify-center gap-2 rounded-(--radius-btn) bg-[var(--kds-line)] type-button text-[var(--kds-ink)] transition-colors hover:bg-[var(--kds-box)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kds-ink)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <SvgIconMap.CardCheck aria-hidden="true" />
        <span>{isCompleting ? '處理中…' : '整單出完'}</span>
      </button>

      {isCancelDialogOpen && (
        <KdsDialog
          titleId={`cancel-ticket-title-${ticketId}`}
          title="取消訂單"
          busy={isCancelling}
          onClose={() => setIsCancelDialogOpen(false)}
          onSubmit={handleCancelSubmit}
        >
          <p className="mb-4 type-body-sm text-[var(--kds-ink-2)]">整張單都還沒出餐才能取消，庫存會補回。</p>
          <label htmlFor={`cancel-ticket-reason-${ticketId}`} className="mb-2 block type-body-sm font-medium">
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
            className={reasonFieldClass}
          />
          {cancelError && (
            <p role="alert" className="mt-3 type-body-sm text-[var(--kds-late)]">
              {cancelError}
            </p>
          )}
          <div className="mt-5 flex justify-end">
            <div className="w-32">
              <SOButton
                type="submit"
                variant="danger"
                height="h-11"
                disabled={isCancelling || !cancelReason.trim()}
                content={isCancelling ? '取消中…' : '確定'}
              />
            </div>
          </div>
        </KdsDialog>
      )}

      {action && (
        <KdsDialog
          titleId={`item-action-title-${ticketId}`}
          title={action.title}
          busy={isItemActionPending}
          onClose={closeItemAction}
          onSubmit={handleItemActionSubmit}
        >
          <p className="mb-4 type-body-sm text-[var(--kds-ink-2)]">{action.hint}</p>
          {actionItems.length === 0 ? (
            <p className="type-body text-[var(--kds-ink-2)]">{action.empty}</p>
          ) : (
            <>
              <div className="max-h-[40vh] space-y-2 overflow-y-auto">
                {actionItems.map((item) => {
                  const isSelected = selectedItemId === item.id
                  const detail = itemDetail(item)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedItemId(isSelected ? null : item.id)
                        setItemActionError('')
                      }}
                      className={`flex min-h-11 w-full flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[var(--kds-ink)] ${
                        isSelected
                          ? 'border-[var(--kds-ink-2)] bg-[var(--kds-line)]'
                          : 'border-[var(--kds-line)] hover:bg-[var(--kds-line)]'
                      }`}
                    >
                      <span className="type-body font-bold">
                        {item.itemNameSnapshot} ×{item.quantity}
                        {item.status === 'SERVED' && (
                          <span className="ml-2 type-body-sm font-normal text-[var(--kds-done)]">已出餐</span>
                        )}
                      </span>
                      {detail && <span className="type-body-sm text-[var(--kds-ink-3)]">{detail}</span>}
                    </button>
                  )
                })}
              </div>
              {selectedItemId !== null && (
                <div className="mt-4 border-t border-[var(--kds-line)] pt-4">
                  <label htmlFor={`item-action-reason-${ticketId}`} className="mb-2 block type-body-sm font-medium">
                    {action.reasonLabel}
                  </label>
                  <textarea
                    id={`item-action-reason-${ticketId}`}
                    name="reason"
                    value={itemReason}
                    onChange={(event) => setItemReason(event.target.value)}
                    rows={3}
                    maxLength={100}
                    placeholder={action.placeholder}
                    className={reasonFieldClass}
                  />
                </div>
              )}
            </>
          )}
          {itemActionError && (
            <p role="alert" className="mt-3 type-body-sm text-[var(--kds-late)]">
              {itemActionError}
            </p>
          )}
          {selectedItemId !== null && (
            <div className="mt-5 flex justify-end">
              <div className="w-32">
                <SOButton
                  type="submit"
                  variant="danger"
                  height="h-11"
                  disabled={isItemActionPending || !itemReason.trim()}
                  content={isItemActionPending ? action.pending : action.submit}
                />
              </div>
            </div>
          )}
        </KdsDialog>
      )}
    </article>
  )
}
