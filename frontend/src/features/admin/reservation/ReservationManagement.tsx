import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { SvgIconMap } from '@/assets/SvgIconMap'
import SeatDialog, { type SeatTable } from '@/components/dashboard/SeatDialog'
import TopBar from '@/components/dashboard/TopBar'
import CancelReservationDialog from '@/features/admin/reservation/CancelReservationDialog'

type ReservationStatus = 'CONFIRMED' | 'SEATED' | 'CANCELLED'

type Reservation = {
  id: number
  startAt: Date
  name: string
  phone: string
  isMember: boolean
  partySize: number
  tableNo?: string
  preorder?: { itemCount: number; estimated: number }
  status: ReservationStatus
  cancelledBy?: string
}

type RowState = 'NOT_YET' | 'CHECKIN_OPEN' | 'OVERDUE' | 'SEATED' | 'CANCELLED'

function ReservationManagement() {
  const navigate = useNavigate()
  const [now, setNow] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [reservations, setReservations] = useState(() => createReservations(new Date(), new Date()))
  const [tables, setTables] = useState(INITIAL_TABLES)
  const [seatingTarget, setSeatingTarget] = useState<Reservation | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null)
  const [detailTarget, setDetailTarget] = useState<Reservation | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const rowStates = reservations.map((reservation) => getRowState(reservation, now))
  const seatedCount = rowStates.filter((state) => state === 'SEATED').length
  const pendingCount = rowStates.filter(
    (state) => state === 'NOT_YET' || state === 'CHECKIN_OPEN',
  ).length
  const overdueCount = rowStates.filter((state) => state === 'OVERDUE').length
  const preorderCount = reservations.filter((reservation) => reservation.preorder).length

  function updateReservation(id: number, changes: Partial<Reservation>) {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)))
  }

  function changeDate(days: number) {
    const nextDate = new Date(selectedDate)
    nextDate.setDate(nextDate.getDate() + days)
    setSelectedDate(nextDate)
    setReservations(createReservations(nextDate, now))
    setTables(INITIAL_TABLES)
  }

  function handleSeat(tableNo: string) {
    if (!seatingTarget) return
    updateReservation(seatingTarget.id, { status: 'SEATED', tableNo })
    setTables((prev) => prev.map((t) => (t.tableNo === tableNo ? { ...t, status: 'OCCUPIED' } : t)))
    setSeatingTarget(null)
  }

  function handleCancel() {
    if (!cancelTarget) return
    updateReservation(cancelTarget.id, {
      status: 'CANCELLED',
      tableNo: undefined,
      preorder: undefined,
      cancelledBy: STAFF_NAME,
    })
    setCancelTarget(null)
  }

  return (
    <div className="flex h-full flex-col bg-paper text-ink-900">
      <TopBar
        childrenLeft={
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="前一天"
              onClick={() => changeDate(-1)}
              className="flex size-9 items-center justify-center rounded-btn text-ink-600 hover:bg-surface-2"
            >
              <SvgIconMap.DashboardBack aria-hidden="true" className="svg-icon size-5" />
            </button>
            <span className="type-body font-bold text-ink-900 tabular-nums">
              {formatDate(selectedDate)}
            </span>
            <span className="type-caption text-ink-600 tabular-nums">現在 {formatTime(now)}</span>
            <button
              type="button"
              aria-label="後一天"
              onClick={() => changeDate(1)}
              className="flex size-9 items-center justify-center rounded-btn text-ink-600 hover:bg-surface-2"
            >
              <SvgIconMap.DashboardBack
                aria-hidden="true"
                className="svg-icon size-5 rotate-180"
              />
            </button>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
        <section className="flex items-center gap-6 rounded-card border border-line bg-surface px-5 py-4">
          <Stat value={reservations.length} label="今日預約" />
          <Divider />
          <Stat value={seatedCount} label="已報到" valueClass="text-success" />
          <Divider />
          <Stat value={pendingCount} label="待報到" valueClass="text-accent-600" />
          <Divider />
          <Stat value={overdueCount} label="逾時未到" valueClass="text-danger" />
          <Divider />
          <Stat value={preorderCount} label="已預先點餐" />
          <span className="ml-auto type-caption text-ink-600">
            可預約比例 70%・18 桌中開放 13 桌
          </span>
        </section>

        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full type-body-sm">
            <thead className="bg-surface-2 text-left type-caption font-bold tracking-wide text-ink-600">
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={column.label}
                    className={`border-b border-line px-4 py-3 whitespace-nowrap ${column.width}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <ReservationRow
                  key={reservation.id}
                  reservation={reservation}
                  now={now}
                  onCheckIn={() => setSeatingTarget(reservation)}
                  onCancel={() => setCancelTarget(reservation)}
                  onRegisterWaitlist={() => navigate('/admin/waitlist')}
                  onViewTable={() => navigate('/admin/table/detail')}
                  onDetails={() => setDetailTarget(reservation)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 rounded-btn bg-warning-bg px-4 py-3 type-body-sm text-warning-ink">
          <SvgIconMap.CartTime aria-hidden="true" className="svg-icon mt-1 size-4.5 flex-none" />
          <p>
            <b>
              開始前 {CHECK_IN_EARLY_MINUTES} 分～開始後 {OVERDUE_MINUTES} 分可以報到
            </b>
            ，這段時間配到的桌會先鎖住；<b>「取消訂位」隨時可按</b>。逾時請改登記候位。
            <b>預先點餐是預估金額，訂位不收錢</b>。
          </p>
        </div>
      </div>

      {seatingTarget && (
        <SeatDialog
          title={`${seatingTarget.name}・${seatingTarget.partySize} 位`}
          summary={getSeatSummary(seatingTarget)}
          partySize={seatingTarget.partySize}
          tables={getSeatTables(tables, reservations, seatingTarget, now)}
          ownHoldTableNo={seatingTarget.tableNo}
          onClose={() => setSeatingTarget(null)}
          onConfirm={handleSeat}
        />
      )}

      {cancelTarget && (
        <CancelReservationDialog
          name={cancelTarget.name}
          time={formatTime(cancelTarget.startAt)}
          tableNo={cancelTarget.tableNo}
          onConfirm={handleCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {detailTarget && (
        <ReservationDetailsDialog
          reservation={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  )
}

export default ReservationManagement

const CHECK_IN_EARLY_MINUTES = 30
const OVERDUE_MINUTES = 10
const UPCOMING_WINDOW_MINUTES = 115
const MINUTE_MS = 60000
const STAFF_NAME = '小美'
const WEEKDAYS = '日一二三四五六'

const COLUMNS = [
  { label: '時段', width: 'w-18' },
  { label: '姓名', width: 'w-24' },
  { label: '電話', width: 'w-30' },
  { label: '人數', width: 'w-16' },
  { label: '配桌', width: 'w-16' },
  { label: '預先點餐', width: 'w-40' },
  { label: '狀態', width: 'w-49' },
  { label: '操作', width: '' },
]

const INITIAL_TABLES: SeatTable[] = [
  { tableNo: 'A01', capacity: 2, area: 'A 區・窗邊', status: 'OCCUPIED' },
  { tableNo: 'A02', capacity: 2, area: 'A 區・窗邊', status: 'AVAILABLE' },
  { tableNo: 'A04', capacity: 4, area: 'A 區・窗邊', status: 'AVAILABLE' },
  { tableNo: 'A05', capacity: 4, area: 'A 區・走道', status: 'AVAILABLE' },
  { tableNo: 'A06', capacity: 6, area: 'A 區・走道', status: 'AVAILABLE' },
  { tableNo: 'A08', capacity: 4, area: 'A 區・窗邊', status: 'AVAILABLE' },
  { tableNo: 'B02', capacity: 2, area: 'B 區', status: 'OCCUPIED' },
  { tableNo: 'B04', capacity: 4, area: 'B 區', status: 'AVAILABLE' },
  { tableNo: 'C02', capacity: 8, area: 'C 包廂', status: 'AVAILABLE' },
]

function createReservations(selectedDate: Date, now: Date): Reservation[] {
  const startAfter = (minutes: number) => {
    const date = new Date(selectedDate)
    date.setHours(now.getHours(), now.getMinutes() + minutes, 0, 0)
    return date
  }

  return [
    {
      id: 1,
      startAt: startAfter(-66),
      name: '王大明',
      phone: '0912345678',
      isMember: true,
      partySize: 2,
      tableNo: 'A01',
      status: 'SEATED',
    },
    {
      id: 2,
      startAt: startAfter(-36),
      name: '鄭文彬',
      phone: '0916123728',
      isMember: false,
      partySize: 2,
      tableNo: 'B02',
      status: 'CONFIRMED',
    },
    {
      id: 3,
      startAt: startAfter(-6),
      name: '張小雯',
      phone: '0921456037',
      isMember: true,
      partySize: 2,
      status: 'CANCELLED',
      cancelledBy: STAFF_NAME,
    },
    {
      id: 4,
      startAt: startAfter(25),
      name: '陳怡君',
      phone: '0933789210',
      isMember: true,
      partySize: 4,
      tableNo: 'A08',
      preorder: { itemCount: 4, estimated: 1980 },
      status: 'CONFIRMED',
    },
    {
      id: 5,
      startAt: startAfter(45),
      name: '林家豪',
      phone: '0935123806',
      isMember: false,
      partySize: 2,
      tableNo: 'B02',
      status: 'CONFIRMED',
    },
    {
      id: 6,
      startAt: startAfter(60),
      name: '吳美玲',
      phone: '0987654553',
      isMember: true,
      partySize: 8,
      tableNo: 'C02',
      preorder: { itemCount: 7, estimated: 3240 },
      status: 'CONFIRMED',
    },
    {
      id: 7,
      startAt: startAfter(90),
      name: '黃先生',
      phone: '0955321192',
      isMember: false,
      partySize: 4,
      tableNo: 'A04',
      status: 'CONFIRMED',
    },
    {
      id: 8,
      startAt: startAfter(120),
      name: '劉品妤',
      phone: '0978123361',
      isMember: false,
      partySize: 4,
      status: 'CANCELLED',
    },
  ]
}

function getRowState(reservation: Reservation, now: Date): RowState {
  if (reservation.status === 'SEATED') return 'SEATED'
  if (reservation.status === 'CANCELLED') return 'CANCELLED'

  const minutesToStart = (reservation.startAt.getTime() - now.getTime()) / MINUTE_MS
  if (minutesToStart > CHECK_IN_EARLY_MINUTES) return 'NOT_YET'
  if (minutesToStart < -OVERDUE_MINUTES) return 'OVERDUE'
  return 'CHECKIN_OPEN'
}

function getSeatSummary({ startAt, tableNo, preorder }: Reservation) {
  return [
    `${formatTime(startAt)} 訂位`,
    tableNo && `保留 ${tableNo}`,
    preorder ? `已預先點餐 ${preorder.itemCount} 項` : '未預點',
  ]
    .filter(Boolean)
    .join('・')
}

function getSeatTables(
  tables: SeatTable[],
  reservations: Reservation[],
  target: Reservation,
  now: Date,
): SeatTable[] {
  const others = reservations.filter((reservation) => reservation.id !== target.id)
  const heldTableNos = others.flatMap((reservation) =>
    reservation.tableNo && getRowState(reservation, now) === 'CHECKIN_OPEN'
      ? [reservation.tableNo]
      : [],
  )
  const windowStart = now.getTime()
  const windowEnd = windowStart + UPCOMING_WINDOW_MINUTES * MINUTE_MS

  return tables
    .filter((table) => !heldTableNos.includes(table.tableNo))
    .map((table) => {
      const upcoming = others
        .filter(
          (reservation) =>
            reservation.tableNo === table.tableNo &&
            reservation.status === 'CONFIRMED' &&
            reservation.startAt.getTime() > windowStart &&
            reservation.startAt.getTime() <= windowEnd,
        )
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0]
      return upcoming ? { ...table, upcomingReservation: formatTime(upcoming.startAt) } : table
    })
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}（${WEEKDAYS[date.getDay()]}）`
}

function maskPhone(phone: string) {
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`
}

type StatProps = {
  value: number
  label: string
  valueClass?: string
}

function Stat({ value, label, valueClass = 'text-ink-900' }: StatProps) {
  return (
    <div className="flex flex-none items-baseline gap-2 whitespace-nowrap">
      <span className={`type-h1 leading-none tabular-nums ${valueClass}`}>{value}</span>
      <span className="type-caption text-ink-600">{label}</span>
    </div>
  )
}

function Divider() {
  return <span className="w-px flex-none self-stretch bg-line" />
}

type RowProps = {
  reservation: Reservation
  now: Date
  onCheckIn: () => void
  onCancel: () => void
  onRegisterWaitlist: () => void
  onViewTable: () => void
  onDetails: () => void
}

function ReservationRow({
  reservation,
  now,
  onCheckIn,
  onCancel,
  onRegisterWaitlist,
  onViewTable,
  onDetails,
}: RowProps) {
  const { startAt, name, phone, partySize, tableNo, preorder, cancelledBy } = reservation
  const state = getRowState(reservation, now)
  const pill = STATE_PILL[state]
  const checkInOpensAt = new Date(startAt.getTime() - CHECK_IN_EARLY_MINUTES * MINUTE_MS)

  return (
    <tr className={`border-b border-line last:border-b-0 ${state === 'CANCELLED' ? 'opacity-55' : ''}`}>
      <td className="px-4 py-3 type-body font-bold tabular-nums">{formatTime(startAt)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="type-body font-bold whitespace-nowrap">{name}</span>
          <Pill tone="plain">{reservation.isMember ? '會員' : '匿名'}</Pill>
        </div>
      </td>
      <td className="px-4 py-3 tabular-nums">{maskPhone(phone)}</td>
      <td className="px-4 py-3 tabular-nums">{partySize} 位</td>
      <td className="px-4 py-3 font-bold tabular-nums">{tableNo ?? <EmptyMark />}</td>
      <td className="px-4 py-3">
        {preorder ? (
          <Pill tone="accent">
            {preorder.itemCount} 項・預估 {preorder.estimated.toLocaleString()}
          </Pill>
        ) : (
          <EmptyMark />
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Pill tone={pill.tone}>{pill.label}</Pill>
          {state === 'CHECKIN_OPEN' && tableNo && (
            <span className="flex items-center gap-1 type-caption font-bold whitespace-nowrap text-hold-ink">
              <SvgIconMap.ReservationLock aria-hidden="true" className="svg-icon size-4" />
              保留 {tableNo}
            </span>
          )}
          {state === 'CANCELLED' && cancelledBy && (
            <span className="type-caption whitespace-nowrap text-ink-600">
              店家代取消・{cancelledBy}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {state === 'NOT_YET' && (
            <>
              <span className="type-caption whitespace-nowrap text-ink-600 tabular-nums">
                {formatTime(checkInOpensAt)} 起可報到
              </span>
              <RowButton onClick={onCancel}>取消訂位</RowButton>
            </>
          )}
          {state === 'CHECKIN_OPEN' && (
            <>
              <RowButton variant="primary" onClick={onCheckIn}>
                報到開桌
              </RowButton>
              <RowButton onClick={onCancel}>取消訂位</RowButton>
            </>
          )}
          {state === 'OVERDUE' && <RowButton onClick={onRegisterWaitlist}>登記候位</RowButton>}
          {state === 'SEATED' && <RowButton onClick={onViewTable}>看桌位</RowButton>}
          {state === 'CANCELLED' && <RowButton onClick={onDetails}>明細</RowButton>}
        </div>
      </td>
    </tr>
  )
}

function EmptyMark() {
  return <span className="text-ink-400">—</span>
}

type PillTone = 'info' | 'done' | 'danger' | 'plain' | 'accent'

const PILL_TONE: Record<PillTone, string> = {
  info: 'bg-info-bg text-info-ink ring-1 ring-info-line ring-inset',
  done: 'bg-success text-surface',
  danger: 'bg-danger text-surface',
  plain: 'bg-surface-2 text-ink-600 ring-1 ring-line ring-inset',
  accent: 'bg-accent-500 text-ink-900 ring-[1.5px] ring-accent-600 ring-inset',
}

const STATE_PILL: Record<RowState, { tone: PillTone; label: string }> = {
  NOT_YET: { tone: 'info', label: '已確認' },
  CHECKIN_OPEN: { tone: 'info', label: '已確認' },
  OVERDUE: { tone: 'danger', label: '逾時未到' },
  SEATED: { tone: 'done', label: '已報到' },
  CANCELLED: { tone: 'plain', label: '已取消' },
}

type PillProps = {
  tone: PillTone
  children: ReactNode
}

function Pill({ tone, children }: PillProps) {
  return (
    <span
      className={`inline-flex flex-none items-center rounded-pill px-2.5 py-0.5 type-caption font-medium whitespace-nowrap ${PILL_TONE[tone]}`}
    >
      {children}
    </span>
  )
}

type RowButtonProps = {
  variant?: 'primary' | 'ghost'
  onClick?: () => void
  children: ReactNode
}

const ROW_BUTTON_VARIANT = {
  primary: 'bg-brand-600 text-surface hover:bg-brand-700',
  ghost: 'text-ink-600 hover:text-brand-600',
}

function RowButton({ variant = 'ghost', onClick, children }: RowButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 flex-none items-center rounded-btn px-3.5 type-body-sm font-medium whitespace-nowrap transition-colors active:scale-98 ${ROW_BUTTON_VARIANT[variant]}`}
    >
      {children}
    </button>
  )
}

type ReservationDetailsDialogProps = {
  reservation: Reservation
  onClose: () => void
}

function ReservationDetailsDialog({ reservation, onClose }: ReservationDetailsDialogProps) {
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
        aria-labelledby="reservation-details-title"
        className="relative w-110 max-w-[calc(100%-2rem)] rounded-card border border-line bg-surface p-8 shadow-pop"
      >
        <div className="flex items-start gap-3">
          <h2 id="reservation-details-title" className="flex-1 type-h2 text-ink-900">
            訂位明細
          </h2>
          <button
            type="button"
            aria-label="關閉"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full text-2xl text-ink-900 hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-[5rem_1fr] gap-x-4 gap-y-3 type-body-sm">
          <dt className="text-ink-600">姓名</dt>
          <dd className="font-bold text-ink-900">{reservation.name}</dd>
          <dt className="text-ink-600">電話</dt>
          <dd className="tabular-nums text-ink-900">{reservation.phone}</dd>
          <dt className="text-ink-600">身分</dt>
          <dd className="text-ink-900">{reservation.isMember ? '會員' : '匿名'}</dd>
          <dt className="text-ink-600">時間</dt>
          <dd className="tabular-nums text-ink-900">{formatTime(reservation.startAt)}</dd>
          <dt className="text-ink-600">人數</dt>
          <dd className="text-ink-900">{reservation.partySize} 位</dd>
          <dt className="text-ink-600">配桌</dt>
          <dd className="text-ink-900">{reservation.tableNo ?? '—'}</dd>
          <dt className="text-ink-600">狀態</dt>
          <dd className="text-ink-900">
            {reservation.status === 'CANCELLED'
              ? `已取消${reservation.cancelledBy ? `・店家代取消・${reservation.cancelledBy}` : ''}`
              : reservation.status === 'SEATED'
                ? '已報到'
                : '已確認'}
          </dd>
          {reservation.preorder && (
            <>
              <dt className="text-ink-600">預先點餐</dt>
              <dd className="text-ink-900">
                {reservation.preorder.itemCount} 項・預估{' '}
                {reservation.preorder.estimated.toLocaleString()} 元
              </dd>
            </>
          )}
        </dl>
      </div>
    </div>
  )
}
