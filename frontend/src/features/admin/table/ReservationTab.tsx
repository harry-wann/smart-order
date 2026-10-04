import { useState } from 'react'
import SOButton from '@/components/SOButton'
import { SvgIconMap } from '@/assets/SvgIconMap'
import CancelReservationDialog from '@/features/admin/reservation/CancelReservationDialog'

export type Reservation = {
  id: number
  time: string
  name: string
  phone: string
  people: number
  preorderCount: number
  assignedTable: string
}

type OpenPayload = {
  type: 'reservation'
  reservationId: number
  people: number
}

export type Props = {
  list: Reservation[]
  tableNo: string
  seats: number
  holdId: number | null
  openLabel: string
  onOpen: (payload: OpenPayload) => void
  onCancel: (id: number) => void
}

function ReservationTab({ list, tableNo, seats, holdId, openLabel, onOpen, onCancel }: Props) {
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null)

  const held = list.find((item) => item.id === holdId)
  const others = list.filter((item) => item !== held)
  const rows = held ? [held, ...others] : list
  const otherNames = others.map((item) => item.name).join('、')

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="type-h2 text-ink-900">現在可以報到的預約</h2>
          <span className="type-caption text-ink-600">
            用餐時間在現在 −10 分 ～ +30 分・{seats} 位以內坐得下
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="py-10 text-center type-body-sm text-ink-600">目前沒有可報到的預約</p>
        ) : (
          rows.map((item) => (
            <ReservationRow
              key={item.id}
              item={item}
              isHeld={item === held}
              isBlocked={held !== undefined && item !== held}
              openLabel={openLabel}
              onOpen={() =>
                onOpen({ type: 'reservation', reservationId: item.id, people: item.people })
              }
              onCancel={() => setCancelTarget(item)}
            />
          ))
        )}

        <div className="flex gap-2 rounded-card bg-surface-2 px-5 py-4 type-caption text-ink-600">
          <SvgIconMap.InfoboxCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            {held && (
              <>
                <b>保留中的桌只開給保留的那一筆。</b>
                {otherNames && `${otherNames}請從預約管理報到，另選一張桌。`}
                <br />
                其他情況照舊
              </>
            )}
            <b>不限定原本配到哪一張桌</b>，開桌也不會去改那筆訂位的桌號。
            <br />
            報到後狀態轉成已報到；有預點的單這時候才進 KDS、這時候才扣庫存。
          </div>
        </div>
      </div>

      {cancelTarget && (
        <CancelReservationDialog
          name={cancelTarget.name}
          time={cancelTarget.time}
          tableNo={tableNo}
          onConfirm={() => {
            onCancel(cancelTarget.id)
            setCancelTarget(null)
          }}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </>
  )
}

export default ReservationTab

type ReservationRowProps = {
  item: Reservation
  isHeld: boolean
  isBlocked: boolean
  openLabel: string
  onOpen: () => void
  onCancel: () => void
}

function ReservationRow({
  item,
  isHeld,
  isBlocked,
  openLabel,
  onOpen,
  onCancel,
}: ReservationRowProps) {
  return (
    <div
      className={`flex items-center gap-6 rounded-card border px-5 py-4 ${
        isHeld ? 'border-accent-500 bg-accent-100' : 'border-line'
      }`}
    >
      <span className="w-18 type-h2 text-ink-900 tabular-nums">{item.time}</span>

      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <b className="type-body text-ink-900">{item.name}</b>
          <span className="type-caption text-ink-600 tabular-nums">{maskPhone(item.phone)}</span>
          <PreorderBadge count={item.preorderCount} />
        </div>
        <p className="type-caption text-ink-600 tabular-nums">
          {item.people} 位
          {isHeld ? (
            <b className="ml-2 inline-flex items-center gap-1 text-hold-ink">
              <SvgIconMap.ReservationLock aria-hidden="true" className="svg-icon size-4" />
              保留中
            </b>
          ) : (
            `・訂位時配到 ${item.assignedTable}`
          )}
        </p>
      </div>

      {isHeld ? (
        <div className="flex gap-2">
          <div className="w-32">
            <SOButton text="取消訂位" variant="secondary" height="h-9" onClick={onCancel} />
          </div>
          <div className="w-32">
            <SOButton text="報到開桌" height="h-9" onClick={onOpen} />
          </div>
        </div>
      ) : (
        <div className="flex w-32 flex-col items-end gap-1">
          <SOButton text={openLabel} height="h-9" onClick={onOpen} disabled={isBlocked} />
          {isBlocked && <span className="type-caption text-ink-600">這張桌保留中</span>}
        </div>
      )}
    </div>
  )
}

function PreorderBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="rounded-pill bg-surface-2 px-2.5 py-0.5 type-caption text-ink-600 shadow-[inset_0_0_0_1px_var(--color-line)]">
        未預點
      </span>
    )
  }

  return (
    <span className="rounded-pill bg-accent-500 px-2.5 py-0.5 type-caption text-ink-900 shadow-[inset_0_0_0_1.5px_var(--color-accent-600)]">
      已預先點餐 {count} 項
    </span>
  )
}

function maskPhone(phone: string) {
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`
}
