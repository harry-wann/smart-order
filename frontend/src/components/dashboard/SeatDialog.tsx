import { useEffect, useState, type ReactNode } from 'react'
import { SvgIconMap } from '@/assets/SvgIconMap'
import SOButton from '@/components/SOButton'

export type SeatTable = {
  tableNo: string
  capacity: number
  area: string
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'RESERVED'
  upcomingReservation?: string
}

export type Props = {
  title: string
  subtitle?: string
  summary?: string
  partySize: number
  tables: SeatTable[]
  ownHoldTableNo?: string
  onClose: () => void
  onConfirm: (tableNo: string) => void
}

function SeatDialog({
  title,
  subtitle = '列出座位數坐得下的空桌',
  summary,
  partySize,
  tables,
  ownHoldTableNo,
  onClose,
  onConfirm,
}: Props) {
  const [pickedNo, setPickedNo] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const options = getSeatOptions(tables, partySize, ownHoldTableNo)
  const selected: SeatTable | undefined =
    options.find((table) => table.tableNo === pickedNo) ?? options[0]
  const clashTable = confirming && selected?.upcomingReservation ? selected : null
  const hasOwnHold = options.some((table) => table.tableNo === ownHoldTableNo)

  function handleMainClick() {
    if (!selected) return
    if (selected.upcomingReservation && !confirming) {
      setConfirming(true)
      return
    }
    onConfirm(selected.tableNo)
  }

  if (!selected) {
    return (
      <DialogFrame title={title} subtitle={subtitle} summary={summary} onClose={onClose}>
        <div className="mt-6 rounded-card bg-surface-2 px-4 py-8 text-center">
          <p className="type-h3 text-ink-900">目前沒有坐得下的空桌</p>
          <p className="mt-1 type-caption text-ink-600">清潔完成或有桌結帳後再試一次</p>
        </div>
        <div className="mt-6">
          <SOButton variant="secondary" height="h-13" text="關閉" onClick={onClose} />
        </div>
      </DialogFrame>
    )
  }

  if (clashTable) {
    return (
      <DialogFrame title={`確定要開 ${clashTable.tableNo}？`} onClose={onClose}>
        <div className="mt-4 flex gap-2 rounded-btn bg-danger-bg px-4 py-3 text-danger-ink ring-[1.5px] ring-danger ring-inset">
          <SvgIconMap.InfoxboxTriangle
            aria-hidden="true"
            className="svg-icon mt-1 size-4.5 flex-none text-danger"
          />
          <p className="type-body-sm">
            {`${clashTable.tableNo} 在 ${clashTable.upcomingReservation} 有訂位。現在開桌，客人可能還沒吃完訂位就到了。`}
            <br />
            只提醒、不擋；想把桌留給那組，就換一張桌。
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <div className="w-32 flex-none">
            <SOButton
              variant="ghost"
              height="h-13"
              text="換一張桌"
              onClick={() => setConfirming(false)}
            />
          </div>
          <div className="flex-1">
            <SOButton height="h-13" text="確定開桌" onClick={handleMainClick} />
          </div>
        </div>
      </DialogFrame>
    )
  }

  return (
    <DialogFrame title={title} subtitle={subtitle} summary={summary} onClose={onClose}>
      <div role="radiogroup" aria-label="選擇桌位" className="mt-6 flex flex-col gap-2">
        {options.map((table) => (
          <TableOption
            key={table.tableNo}
            table={table}
            isOwnHold={table.tableNo === ownHoldTableNo}
            isSelected={table.tableNo === selected.tableNo}
            onSelect={() => setPickedNo(table.tableNo)}
          />
        ))}
      </div>

      <p className="mt-3 type-caption text-ink-600">
        {hasOwnHold
          ? '原保留桌排第一，其他依座位數由小到大；稍後有訂位的桌排最後，一樣能開，但會再確認一次。'
          : '座位數小的排前面；稍後有訂位的桌排最後，一樣能開，但會再確認一次。預約保留中的桌不會列出來。'}
      </p>

      <div className="mt-6 flex gap-3">
        <div className="w-32 flex-none">
          <SOButton variant="ghost" height="h-13" text="取消" onClick={onClose} />
        </div>
        <div className="flex-1">
          <SOButton
            height="h-13"
            text={
              selected.upcomingReservation
                ? `仍要開 ${selected.tableNo}`
                : `開 ${selected.tableNo}`
            }
            onClick={handleMainClick}
          />
        </div>
      </div>
    </DialogFrame>
  )
}

export default SeatDialog

function getSeatOptions(tables: SeatTable[], partySize: number, ownHoldTableNo?: string) {
  return tables
    .filter(
      (table) =>
        table.capacity >= partySize &&
        (table.status === 'AVAILABLE' ||
          (table.status === 'RESERVED' && table.tableNo === ownHoldTableNo)),
    )
    .sort(
      (a, b) =>
        Number(b.tableNo === ownHoldTableNo) - Number(a.tableNo === ownHoldTableNo) ||
        Number(Boolean(a.upcomingReservation)) - Number(Boolean(b.upcomingReservation)) ||
        a.capacity - b.capacity ||
        a.tableNo.localeCompare(b.tableNo),
    )
}

type DialogFrameProps = {
  title: string
  subtitle?: string
  summary?: string
  onClose: () => void
  children: ReactNode
}

function DialogFrame({ title, subtitle, summary, onClose, children }: DialogFrameProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seat-dialog-title"
        className="relative max-h-[calc(100dvh-2rem)] w-140 max-w-[calc(100%-2rem)] overflow-y-auto rounded-card border border-line bg-surface p-8 shadow-pop"
      >
        <div className="flex items-start gap-2">
          <h2 id="seat-dialog-title" className="flex-1 type-h1 text-ink-900">
            {title}
          </h2>
          <button
            type="button"
            aria-label="關閉"
            onClick={onClose}
            className="flex size-11 flex-none items-center justify-center rounded-full text-2xl text-ink-900 hover:bg-surface-2"
          >
            ×
          </button>
        </div>
        {subtitle && <p className="mt-1 type-body-sm text-ink-600">{subtitle}</p>}
        {summary && (
          <p className="mt-2 flex items-center gap-2 type-caption text-ink-600 tabular-nums">
            <SvgIconMap.CartTime aria-hidden="true" className="svg-icon size-4 flex-none" />
            {summary}
          </p>
        )}

        {children}
      </div>
    </div>
  )
}

type TableOptionProps = {
  table: SeatTable
  isOwnHold: boolean
  isSelected: boolean
  onSelect: () => void
}

function TableOption({ table, isOwnHold, isSelected, onSelect }: TableOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      className={`flex min-h-14 items-center gap-3 rounded-card px-4 py-3 text-left transition-colors ${
        isSelected
          ? 'bg-brand-100 ring-[1.5px] ring-brand-600 ring-inset'
          : 'border border-line bg-surface hover:bg-surface-2'
      }`}
    >
      <span
        className={`size-6 flex-none rounded-full bg-surface ${
          isSelected ? 'border-[7px] border-brand-600' : 'border-[1.5px] border-line'
        }`}
      />
      <span className="w-14 flex-none type-h3 text-ink-900 tabular-nums">{table.tableNo}</span>
      <span className="flex-1 type-body-sm text-ink-600">{table.area}</span>
      {isOwnHold && (
        <span className="flex items-center gap-1 type-caption font-bold whitespace-nowrap text-hold-ink">
          <SvgIconMap.ReservationLock aria-hidden="true" className="svg-icon size-4 flex-none" />
          原保留桌
        </span>
      )}
      {table.upcomingReservation && (
        <span className="flex items-center gap-1 type-caption font-bold whitespace-nowrap text-danger">
          <SvgIconMap.InfoxboxTriangle aria-hidden="true" className="svg-icon size-3.5 flex-none" />
          {table.upcomingReservation} 有訂位
        </span>
      )}
      <span className="inline-flex flex-none items-center rounded-pill bg-surface-2 px-2.5 py-0.5 type-caption font-medium text-ink-600 ring-1 ring-line ring-inset">
        {table.capacity} 人桌
      </span>
    </button>
  )
}
