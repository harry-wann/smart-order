import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { SvgIconMap } from '@/assets/SvgIconMap'
import CustomerTopBar from '@/components/CustomerTopBar'
import InfoBox from '@/components/InfoBox'
import SOButton from '@/components/SOButton'
import { useCancelReservation } from '@/hooks/reservation/useReservationMutations'
import { useGuestReservations, useMyReservations } from '@/hooks/reservation/useReservationQueries'
import type { CancelSource, ReservationDetail, ReservationStatus } from '@/services/api/reservation/types'
import { customerTokens } from '@/services/client/tokenStore'
import { loadReservations } from '@/utils/guestReservation'
import {
  formatDateWithWeekday,
  formatShortDate,
  getDayOffset,
  parseLocalDate,
} from '@/utils/reservationDate'

function Reservations() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // 匿名訂位只記在這支手機：每筆存 id 和 accessToken，狀態一律向後端查。
  // 進頁讀一次就好，取消只改後端的狀態，id 和 token 不會變，不用跟 localStorage 同步
  const [guestRecords] = useState(loadGuestRecords)
  const hasMemberToken = Boolean(customerTokens.member.get())
  // 會員檢視：網址帶 ?view=member（會員訂完從 Done 過來），或這支手機沒有匿名訂位但有會員 token。
  // 另一邊的查詢不發（會員檢視不查匿名的，匿名檢視不打 /members/me）
  const isMemberView =
    searchParams.get('view') === 'member' || (guestRecords.length === 0 && hasMemberToken)
  const memberQuery = useMyReservations(isMemberView && hasMemberToken)
  const guestQuery = useGuestReservations(isMemberView ? [] : guestRecords)
  const cancelReservation = useCancelReservation()
  // 取消期限拿 cancellableUntil 跟 now 比，now 每 30 秒更新，頁面放著不動按鈕也會自己停用
  const [now, setNow] = useState(() => new Date())
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming')
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const details = isMemberView ? (memberQuery.data ?? []) : guestQuery.data
  const reservations = details.map((detail) => toReservation(detail, guestRecords))
  const isLoading = isMemberView ? hasMemberToken && memberQuery.isPending : guestQuery.isPending

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const getTabReservations = (tab: TabKey) =>
    sortForTab(
      reservations.filter(({ status }) => TAB_STATUSES[tab].includes(status)),
      tab,
    )
  const visibleReservations = isMemberView ? getTabReservations(activeTab) : sortForTab(reservations, 'upcoming')

  function handleConfirmCancel() {
    if (!cancelTarget) return
    const target = cancelTarget
    // 先關確認框再送出，送出中的狀態顯示在那張卡片的按鈕上（cancelling）。
    // 成功不用手動改畫面，hook 會 invalidate 清單，重抓後那筆就變成已取消；
    // 被後端擋下來（例如過了期限）的訊息顯示在清單上方
    setCancelTarget(null)
    setNotice(null)
    cancelReservation.mutate(
      { id: target.id, accessToken: target.accessToken },
      { onError: (error) => setNotice(error.message) },
    )
  }

  if (isMemberView && !hasMemberToken) {
    return (
      <div className="flex min-h-full w-full flex-col">
        <CustomerTopBar title="我的預約" showBackButton={true} />
        <div className="flex flex-col items-center gap-4 p-page pt-16 text-center">
          <p className="type-body text-ink-600">登入會員後，就能看到用會員訂的所有預約。</p>
          <SOButton
            height="h-13"
            text="登入／註冊會員"
            onClick={() =>
              navigate('/member/login', { state: { returnTo: '/member/reservations?view=member' } })
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full w-full flex-col">
      <CustomerTopBar title="我的預約" showBackButton={true} />

      {isMemberView && (
        <div role="tablist" className="flex gap-6 border-b border-line bg-surface px-page">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={key === activeTab}
              onClick={() => setActiveTab(key)}
              className={[
                'flex h-12 items-center border-b-2 type-body',
                key === activeTab
                  ? 'border-brand-600 font-bold text-brand-600'
                  : 'border-transparent text-ink-600',
              ].join(' ')}
            >
              {label} {getTabReservations(key).length}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 p-page pb-28">
        {((!isMemberView && visibleReservations.some(({ status }) => status === 'CONFIRMED')) ||
          (isMemberView && activeTab === 'upcoming')) && (
          <div className="[&>br]:hidden">
            <InfoBox
              outicon={SvgIconMap.TicketTime}
              col="quiet"
              text="F"
              custimtext={UPCOMING_NOTICE}
            />
          </div>
        )}

        {notice && <p className="text-center type-body-sm text-danger">{notice}</p>}

        {isLoading && <p className="py-12 text-center type-body-sm text-ink-600">預約載入中…</p>}

        {!isLoading && memberQuery.isError && isMemberView && (
          <p className="py-12 text-center type-body-sm text-danger">{memberQuery.error.message}</p>
        )}

        {!isLoading && !memberQuery.isError && visibleReservations.length === 0 && (
          <p className="py-12 text-center type-body-sm text-ink-600">目前沒有預約</p>
        )}

        {visibleReservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            now={now}
            cancelling={cancelReservation.isPending && cancelReservation.variables?.id === reservation.id}
            onCancel={() => {
              // now 最多慢 30 秒，按下去的當下再用現在的時間確認一次期限
              setNow(new Date())
              if (!isCancellationDeadlinePassed(reservation, new Date())) setCancelTarget(reservation)
            }}
          />
        ))}
      </div>

      <div className="fixed bottom-0 w-full border-t border-line bg-surface px-page pt-3 pb-6">
        <SOButton
          height="h-13"
          variant="secondary"
          text="再訂一次"
          onClick={() => navigate('/reserve')}
        />
      </div>

      {cancelTarget && (
        <CancelSheet
          date={formatShortDate(parseLocalDate(cancelTarget.date))}
          onConfirm={handleConfirmCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  )
}

export default Reservations

type ReservationCardProps = {
  reservation: Reservation
  now: Date
  cancelling: boolean
  onCancel: () => void
}

function ReservationCard({ reservation, now, cancelling, onCancel }: ReservationCardProps) {
  const { time, people, table, status } = reservation
  const date = parseLocalDate(reservation.date)
  const dayOffset = getDayOffset(date)
  const cancelDeadlinePassed = isCancellationDeadlinePassed(reservation, now)
  const note = getNote(status)
  const isUpcoming = status === 'CONFIRMED'

  return (
    <article className="rounded-card border border-line bg-surface p-card shadow-card">
      <div className="flex items-center gap-2">
        {getPills(reservation, cancelDeadlinePassed).map(({ text, tone }) => (
          <StatusPill key={text} text={text} tone={tone} />
        ))}
        {isUpcoming && (
          <span className="ml-auto type-caption text-ink-600">{getDaysLabel(dayOffset)}</span>
        )}
      </div>

      <h3 className="mt-3 type-h2 text-ink-900 tabular-nums">
        {formatDateWithWeekday(date)}
        {time}
      </h3>
      <p className="mt-1 type-body-sm text-ink-600">
        {people} 位{table && `・${table}`}
      </p>
      <p className="type-body-sm text-ink-600">
        預約編號 <span className="tabular-nums">{reservation.reservationNo}</span>
      </p>

      {isUpcoming && (
        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
          <SOButton
            height="h-11"
            variant="ghost"
            disabled={cancelDeadlinePassed || cancelling}
            text={<span className="text-danger">{cancelling ? '取消中…' : '取消訂位'}</span>}
            onClick={onCancel}
          />
          <p className="text-center type-caption text-ink-600">
            {cancelDeadlinePassed
              ? '請來電 02-2591-xxxx'
              : `取消訂位到 ${formatShortDate(date)} ${reservation.cancellableUntil.slice(11, 16)}，之後請來電 02-2591-xxxx`}
          </p>
        </div>
      )}

      {note && (
        <p className="mt-3 border-t border-line pt-3 type-body-sm text-ink-600">{note}</p>
      )}
    </article>
  )
}

type StatusPillProps = {
  text: string
  tone: PillTone
}

function StatusPill({ text, tone }: StatusPillProps) {
  return (
    <span
      className={`shrink-0 rounded-pill border px-2.5 py-0.5 type-caption font-medium ${PILL_TONE_CLASS[tone]}`}
    >
      {text}
    </span>
  )
}

type CancelSheetProps = {
  date: string
  onConfirm: () => void
  onClose: () => void
}

function CancelSheet({ date, onConfirm, onClose }: CancelSheetProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="取消訂位確認"
      className="fixed inset-0 z-50 flex flex-col justify-end"
    >
      <button
        type="button"
        aria-label="關閉"
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/50"
      />
      <div className="relative rounded-t-sheet bg-surface px-page pt-2 pb-6 shadow-pop">
        <div className="mx-auto mt-2 mb-4 h-1 w-10 rounded-pill bg-line" />
        <h2 className="type-h2 text-ink-900">要取消 {date} 的訂位嗎？</h2>
        <p className="mt-2 mb-6 type-body-sm text-ink-600">
          <span className="font-bold text-ink-900">沒有款項需要退還</span>，餐點還沒結帳。
        </p>
        <div className="flex flex-col gap-2">
          <SOButton height="h-13" variant="danger" text="確定取消" onClick={onConfirm} />
          <SOButton height="h-11" variant="ghost" text="先不要" onClick={onClose} />
        </div>
      </div>
    </div>
  )
}

type TabKey = 'upcoming' | 'completed' | 'cancelled'
type PillTone = 'confirmed' | 'warning' | 'plain' | 'danger'

type Reservation = {
  id: number
  accessToken?: string
  reservationNo: string
  date: string
  time: string
  startTime: string
  people: number
  table: string | null
  status: ReservationStatus
  cancelSource: CancelSource | null
  cancellableUntil: string
}

type Pill = {
  text: string
  tone: PillTone
}

type Tab = {
  key: TabKey
  label: string
}

const UPCOMING_NOTICE =
  '訂位時間前 30 分鐘都可以在這裡取消；之後請來電。訂位保留 10 分鐘，逾時視同未到，需現場候位，並移到「已取消」。'

const TABS: Tab[] = [
  { key: 'upcoming', label: '即將到來' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
]

// 已報到入座（SEATED）就算完成
const TAB_STATUSES: Record<TabKey, ReservationStatus[]> = {
  upcoming: ['CONFIRMED'],
  completed: ['SEATED'],
  cancelled: ['CANCELLED', 'NO_SHOW'],
}

const PILL_TONE_CLASS: Record<PillTone, string> = {
  confirmed: 'border-transparent bg-success text-surface',
  warning: 'border-warning-line bg-warning-bg text-hold-ink',
  plain: 'border-line bg-surface-2 text-ink-600',
  danger: 'border-transparent bg-danger text-surface',
}

function loadGuestRecords() {
  return loadReservations('GUEST').flatMap(({ reservation }) =>
    reservation.accessToken ? [{ id: Number(reservation.id), accessToken: reservation.accessToken }] : [],
  )
}

function toReservation(
  detail: ReservationDetail,
  guestRecords: { id: number; accessToken: string }[],
): Reservation {
  const [date, rest] = detail.startTime.split('T')
  return {
    id: detail.reservationId,
    // 只有匿名訂位找得到 token；會員清單這欄是 undefined，取消時就改用會員身分
    accessToken: guestRecords.find(({ id }) => id === detail.reservationId)?.accessToken,
    reservationNo: detail.reservationNo,
    date,
    time: rest.slice(0, 5),
    startTime: detail.startTime,
    people: detail.partySize,
    // 取消後後端會釋放配到的桌，就不顯示桌號
    table: detail.tableNo && `${detail.tableNo}・${detail.area}`,
    status: detail.status,
    cancelSource: detail.cancelSource,
    cancellableUntil: detail.cancellableUntil,
  }
}

// 即將到來由近到遠，其他由新到舊
function sortForTab(reservations: Reservation[], tab: TabKey) {
  const direction = tab === 'upcoming' ? 1 : -1
  return [...reservations].sort(
    (a, b) => direction * (Date.parse(a.startTime) - Date.parse(b.startTime)),
  )
}

function getPills({ status, cancelSource }: Reservation, cancelDeadlinePassed: boolean): Pill[] {
  switch (status) {
    case 'CONFIRMED': {
      const confirmed: Pill = { text: '已確認', tone: 'confirmed' }
      return cancelDeadlinePassed
        ? [confirmed, { text: '已超過取消時間', tone: 'warning' }]
        : [confirmed]
    }
    case 'SEATED':
      return [{ text: '已完成', tone: 'plain' }]
    case 'CANCELLED':
      return [{ text: cancelSource === 'STAFF' ? '店家已代為取消' : '已取消', tone: 'plain' }]
    case 'NO_SHOW':
      return [{ text: '逾時未到', tone: 'danger' }]
  }
}

function getNote(status: ReservationStatus) {
  if (status === 'CANCELLED') return '未產生任何費用'
  if (status === 'NO_SHOW') return '需要的話請重新訂位'
  return null
}

function getDaysLabel(dayOffset: number) {
  if (dayOffset <= 0) return '今天'
  if (dayOffset === 1) return '明天'
  return `還有 ${dayOffset} 天`
}

// 期限用後端給的 cancellableUntil，前端不自己算「前 30 分鐘」，規則只留一份在後端
function isCancellationDeadlinePassed(reservation: Reservation, now: Date) {
  return now.getTime() >= Date.parse(reservation.cancellableUntil)
}
