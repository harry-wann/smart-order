import { useEffect, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { SvgIconMap } from '@/assets/SvgIconMap'
import SeatDialog, { type SeatTable } from '@/components/dashboard/SeatDialog'
import TopBar from '@/components/dashboard/TopBar'
import CancelReservationDialog from '@/features/admin/reservation/CancelReservationDialog'
import {
  useAdminReservations,
  useAvailableTables,
  useCancelReservationByStaff,
  useSeatReservation,
} from '@/hooks/reservation/useAdminReservations'
import type { AdminReservation, AvailableTable } from '@/services/api/reservation/adminReservationApi'
import type { ReservationStatus } from '@/services/api/reservation/types'
import { fetchSeats } from '@/services/api/seatApi'
import { queryScope } from '@/services/client/queryClient'

type Reservation = {
  id: number
  startAt: Date
  checkInFrom: Date
  checkInUntil: Date
  name: string
  phone: string
  isMember: boolean
  partySize: number
  tableNo?: string
  seatedTableNo?: string
  preorder?: { itemCount: number; estimated: number }
  status: ReservationStatus
  cancelledBy?: string
}

type RowState = 'NOT_YET' | 'CHECKIN_OPEN' | 'OVERDUE' | 'SEATED' | 'CANCELLED'

function ReservationManagement() {
  const navigate = useNavigate()
  const [now, setNow] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [seatingTarget, setSeatingTarget] = useState<Reservation | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null)
  const [detailTarget, setDetailTarget] = useState<Reservation | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const reservationsQuery = useAdminReservations(toDateParam(selectedDate))
  const cancelByStaff = useCancelReservationByStaff()
  // 「18 桌中開放 13 桌」：座位設定的 API 已經有了，直接拿來算
  const seatsQuery = useQuery({
    queryKey: [...queryScope.employee, 'seats'],
    queryFn: ({ signal }) => fetchSeats(signal),
  })
  const reservations = (reservationsQuery.data ?? []).map(toReservation)
  // 按下「報到開桌」才查空桌，帶 reservationId 讓後端把這筆自己的保留桌排第一、標「原保留桌」。
  // 還沒選訂位時 partySize 先放 1 湊參數，enabled 是 false，不會真的發請求
  const availableTables = useAvailableTables(
    seatingTarget?.partySize ?? 1,
    seatingTarget?.id,
    seatingTarget !== null,
  )
  const seatReservation = useSeatReservation()
  const [seatNotice, setSeatNotice] = useState<string | null>(null)
  // 搶桌失敗、清單重抓後換一個 key，讓對話框的選取與「再確認」狀態從頭開始。
  // 對話框的 state 只在掛載時初始化，原本選的桌這時可能已經不在新清單裡
  const [seatDialogKey, setSeatDialogKey] = useState(0)

  // 空桌清單查不到（例如權限不足）就關掉對話框，不要讓按鈕看起來沒反應。
  // 直接在 render 裡 set 比用 effect 少渲染一次；條件成立 set 完 seatingTarget 就是 null，不會一直重跑
  if (seatingTarget && availableTables.isError) {
    setSeatingTarget(null)
    setNotice(availableTables.error.message)
  }
  const totalTables = seatsQuery.data?.length ?? 0
  const reservableTables = seatsQuery.data?.filter((seat) => seat.reservable).length ?? 0

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

  function changeDate(days: number) {
    const nextDate = new Date(selectedDate)
    nextDate.setDate(nextDate.getDate() + days)
    setSelectedDate(nextDate)
    setNotice(null)
  }

  function openSeatDialog(reservation: Reservation) {
    setSeatNotice(null)
    setSeatingTarget(reservation)
  }

  function handleSeat(tableNo: string) {
    if (!seatingTarget || seatReservation.isPending) return
    const table = availableTables.data?.find((option) => option.tableNo === tableNo)
    if (!table) return
    setSeatNotice(null)
    seatReservation.mutate(
      { id: seatingTarget.id, tableId: table.tableId },
      {
        onSuccess: (result) => {
          setSeatingTarget(null)
          setNotice(`已報到，開 ${result.tableNo}`)
        },
        onError: (error) => {
          // 桌子剛被開走或撞到別筆的保留：留在對話框、重新載入空桌。
          // 比 error.code 而不是 message 文字，後端錯誤格式是 {code, message, details}
          if (error.code === 'TABLE_OCCUPIED' || error.code === 'TABLE_RESERVED') {
            setSeatNotice(`${error.message}，已重新載入空桌`)
            setSeatDialogKey((key) => key + 1)
            void availableTables.refetch()
            return
          }
          // 訂位已取消、已報到或超過保留時間：關掉對話框，清單會重抓
          setSeatingTarget(null)
          setNotice(error.message)
        },
      },
    )
  }

  function handleCancel() {
    if (!cancelTarget || cancelByStaff.isPending) return
    const target = cancelTarget
    // 先關確認框再送出；成功不用手動改列，hook 會 invalidate，重抓後那列變已取消、桌子也釋出
    setCancelTarget(null)
    setNotice(null)
    cancelByStaff.mutate({ id: target.id }, { onError: (error) => setNotice(error.message) })
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
          {totalTables > 0 && (
            <span className="ml-auto type-caption text-ink-600">
              可預約比例 {Math.round((reservableTables / totalTables) * 100)}%・{totalTables} 桌中開放{' '}
              {reservableTables} 桌
            </span>
          )}
        </section>

        {notice && <p className="type-body-sm text-danger">{notice}</p>}
        {reservationsQuery.isError && (
          <p className="type-body-sm text-danger">{reservationsQuery.error.message}</p>
        )}

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
              {reservationsQuery.isPending && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-ink-600">
                    載入中…
                  </td>
                </tr>
              )}
              {reservationsQuery.isSuccess && reservations.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-ink-600">
                    這天沒有訂位
                  </td>
                </tr>
              )}
              {reservations.map((reservation) => (
                <ReservationRow
                  key={reservation.id}
                  reservation={reservation}
                  now={now}
                  onCheckIn={() => openSeatDialog(reservation)}
                  onCancel={() => setCancelTarget(reservation)}
                  onRegisterWaitlist={() => navigate('/admin/waitlist')}
                  onViewTable={() => {
                    if (reservation.seatedTableNo) {
                      navigate(`/admin/table/${encodeURIComponent(reservation.seatedTableNo)}`)
                    }
                  }}
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

      {/* 空桌清單回來才開對話框，沒資料時它會直接顯示「沒有坐得下的空桌」，一閃而過會誤導 */}
      {seatingTarget && availableTables.isSuccess && (
        <SeatDialog
          key={seatDialogKey}
          title={`${seatingTarget.name}・${seatingTarget.partySize} 位`}
          summary={getSeatSummary(seatingTarget)}
          partySize={seatingTarget.partySize}
          tables={availableTables.data.map(toSeatTable)}
          ownHoldTableNo={availableTables.data.find((table) => table.isOwnHold)?.tableNo}
          notice={seatNotice}
          submitting={seatReservation.isPending}
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


// 預先點餐（進階功能 7.E1）還沒做，後端目前固定回 0 件，所以不帶 preorder，預點欄都是空的
function toReservation(row: AdminReservation): Reservation {
  return {
    id: row.reservationId,
    startAt: new Date(row.startTime),
    checkInFrom: new Date(row.checkInFrom),
    checkInUntil: new Date(row.checkInUntil),
    name: row.contactName,
    phone: row.contactPhone,
    isMember: row.member,
    partySize: row.partySize,
    tableNo: row.assignedTableNo ?? undefined,
    seatedTableNo: row.seatedTableNo ?? undefined,
    status: row.status,
    // 只有櫃檯代客取消才顯示「店家代取消・小美」
    cancelledBy: row.cancelSource === 'STAFF' ? (row.cancelledByStaffName ?? undefined) : undefined,
  }
}

function toDateParam(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// 報到時間窗由後端給；過了窗還沒報到就算逾時，不等 NO_SHOW 排程。
// now 每 30 秒更新一次，列的狀態和按鈕會自己從「還沒到」變「可報到」再變「逾時」
function getRowState(reservation: Reservation, now: Date): RowState {
  if (reservation.status === 'SEATED') return 'SEATED'
  if (reservation.status === 'CANCELLED') return 'CANCELLED'
  if (reservation.status === 'NO_SHOW') return 'OVERDUE'

  if (now < reservation.checkInFrom) return 'NOT_YET'
  if (now > reservation.checkInUntil) return 'OVERDUE'
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

// 後端已經篩好、排好；這裡只換成共用選桌對話框要的欄位。
// status 固定 AVAILABLE：清單裡本來就只有能開的桌，原保留桌也在裡面，由 isOwnHold 另外標
function toSeatTable(table: AvailableTable): SeatTable {
  return {
    tableNo: table.tableNo,
    capacity: table.seats,
    area: table.area,
    status: 'AVAILABLE',
    upcomingReservation: table.upcomingReservationAt ?? undefined,
  }
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
  const { startAt, name, phone, partySize, tableNo, seatedTableNo, preorder, cancelledBy } =
    reservation
  const state = getRowState(reservation, now)
  const pill = STATE_PILL[state]
  const checkInOpensAt = reservation.checkInFrom

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
      <td className="px-4 py-3 font-bold tabular-nums">
        {state === 'SEATED' ? seatedTableNo ?? tableNo ?? <EmptyMark /> : tableNo ?? <EmptyMark />}
      </td>
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
          {reservation.seatedTableNo && (
            <>
              <dt className="text-ink-600">實際入座</dt>
              <dd className="text-ink-900">{reservation.seatedTableNo}</dd>
            </>
          )}
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
