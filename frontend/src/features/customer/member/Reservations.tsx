import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { SvgIconMap } from '@/assets/SvgIconMap'
import CustomerTopBar from '@/components/CustomerTopBar'
import InfoBox from '@/components/InfoBox'
import SOButton from '@/components/SOButton'
import {
  addDays,
  formatDateCode,
  formatDateWithWeekday,
  formatShortDate,
  getDayOffset,
  parseLocalDate,
  startOfToday,
} from '@/utils/reservationDate'
import type { ReservationRouteState } from '@/features/customer/reserve/reservation.types'

function Reservations() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeReservation = (location.state as ReservationRouteState | null)?.reservation
  const isGuestReservation = Boolean(routeReservation?.contact)
  const [reservations, setReservations] = useState(() =>
    routeReservation?.contact ? [createGuestReservation(routeReservation)] : INITIAL_RESERVATIONS,
  )
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming')
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null)

  const getTabReservations = (tab: TabKey) =>
    reservations.filter(({ status }) => TAB_STATUSES[tab].includes(status))
  const visibleReservations = isGuestReservation ? reservations : getTabReservations(activeTab)

  const handleConfirmCancel = () => {
    if (!cancelTarget) return
    setReservations((current) => [
      { ...cancelTarget, status: 'CANCELLED', cancelSource: 'CUSTOMER' },
      ...current.filter(({ serial }) => serial !== cancelTarget.serial),
    ])
    setCancelTarget(null)
  }

  return (
    <div className="flex min-h-full w-full flex-col">
      <CustomerTopBar title="我的預約" showBackButton={true} />

      {!isGuestReservation && (
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
        {((isGuestReservation && visibleReservations.some(({ status }) => status === 'CONFIRMED')) ||
          (!isGuestReservation && activeTab === 'upcoming')) && (
          <div className="[&>br]:hidden">
            <InfoBox
              outicon={SvgIconMap.TicketTime}
              col="quiet"
              text="F"
              custimtext={UPCOMING_NOTICE}
            />
          </div>
        )}

        {visibleReservations.length === 0 && (
          <p className="py-12 text-center type-body-sm text-ink-600">目前沒有預約</p>
        )}

        {visibleReservations.map((reservation) => (
          <ReservationCard
            key={reservation.serial}
            reservation={reservation}
            onCancel={() => setCancelTarget(reservation)}
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
          date={formatShortDate(addDays(startOfToday(), cancelTarget.dayOffset))}
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
  onCancel: () => void
}

function ReservationCard({ reservation, onCancel }: ReservationCardProps) {
  const { serial, dayOffset, time, people, table, status, cancelDeadlinePassed } = reservation
  const date = addDays(startOfToday(), dayOffset)
  const note = getNote(status)
  const isUpcoming = status === 'CONFIRMED'

  return (
    <article className="rounded-card border border-line bg-surface p-card shadow-card">
      <div className="flex items-center gap-2">
        {getPills(reservation).map(({ text, tone }) => (
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
        {people} 位・{table}
      </p>
      <p className="type-body-sm text-ink-600">
        預約編號 <span className="tabular-nums">{formatCode(date, serial, reservation.reservationNo)}</span>
      </p>

      {isUpcoming && (
        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
          <SOButton
            height="h-11"
            variant="ghost"
            disabled={cancelDeadlinePassed}
            text={<span className="text-danger">取消訂位</span>}
            onClick={onCancel}
          />
          <p className="text-center type-caption text-ink-600">
            {cancelDeadlinePassed
              ? '請來電 02-2591-xxxx'
              : `取消訂位到 ${formatShortDate(date)} ${getCancelDeadline(time)}，之後請來電 02-2591-xxxx`}
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
type ReservationStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
type PillTone = 'confirmed' | 'warning' | 'plain' | 'danger'

type Reservation = {
  serial: number
  reservationNo?: string
  dayOffset: number
  time: string
  people: number
  table: string
  status: ReservationStatus
  cancelSource?: 'CUSTOMER' | 'STAFF'
  cancelDeadlinePassed?: boolean
}

type Pill = {
  text: string
  tone: PillTone
}

type Tab = {
  key: TabKey
  label: string
}

const CANCEL_BEFORE_MINUTES = 30

const UPCOMING_NOTICE =
  '訂位時間前 30 分鐘都可以在這裡取消；之後請來電。訂位保留 10 分鐘，逾時視同未到，需現場候位，並移到「已取消」。'

const TABS: Tab[] = [
  { key: 'upcoming', label: '即將到來' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
]

const TAB_STATUSES: Record<TabKey, ReservationStatus[]> = {
  upcoming: ['CONFIRMED'],
  completed: ['COMPLETED'],
  cancelled: ['CANCELLED', 'NO_SHOW'],
}

const PILL_TONE_CLASS: Record<PillTone, string> = {
  confirmed: 'border-transparent bg-success text-surface',
  warning: 'border-warning-line bg-warning-bg text-hold-ink',
  plain: 'border-line bg-surface-2 text-ink-600',
  danger: 'border-transparent bg-danger text-surface',
}

const INITIAL_RESERVATIONS: Reservation[] = [
  {
    serial: 52,
    dayOffset: 0,
    time: '18:30',
    people: 2,
    table: 'B02 吧台 2 人桌',
    status: 'CONFIRMED',
    cancelDeadlinePassed: true,
  },
  {
    serial: 38,
    dayOffset: 1,
    time: '18:30',
    people: 2,
    table: 'B05 靠窗 2 人桌',
    status: 'CONFIRMED',
  },
  {
    serial: 43,
    dayOffset: 6,
    time: '18:00',
    people: 4,
    table: 'A08 窗邊 4 人桌',
    status: 'CONFIRMED',
  },
  {
    serial: 61,
    dayOffset: 13,
    time: '19:00',
    people: 6,
    table: 'C01 包廂',
    status: 'CONFIRMED',
  },
  {
    serial: 27,
    dayOffset: -4,
    time: '12:00',
    people: 3,
    table: 'A03 4 人桌',
    status: 'CANCELLED',
    cancelSource: 'CUSTOMER',
  },
  {
    serial: 19,
    dayOffset: -9,
    time: '18:30',
    people: 4,
    table: 'A05 4 人桌',
    status: 'CANCELLED',
    cancelSource: 'STAFF',
  },
  {
    serial: 14,
    dayOffset: -15,
    time: '19:00',
    people: 2,
    table: 'B01 2 人桌',
    status: 'NO_SHOW',
  },
  {
    serial: 22,
    dayOffset: -7,
    time: '18:00',
    people: 4,
    table: 'A02 窗邊 4 人桌',
    status: 'COMPLETED',
  },
  {
    serial: 9,
    dayOffset: -21,
    time: '12:30',
    people: 2,
    table: 'B03 2 人桌',
    status: 'COMPLETED',
  },
]

function getPills({ status, cancelSource, cancelDeadlinePassed }: Reservation): Pill[] {
  switch (status) {
    case 'CONFIRMED': {
      const confirmed: Pill = { text: '已確認', tone: 'confirmed' }
      return cancelDeadlinePassed
        ? [confirmed, { text: '已超過取消時間', tone: 'warning' }]
        : [confirmed]
    }
    case 'COMPLETED':
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
  if (dayOffset === 0) return '今天'
  if (dayOffset === 1) return '明天'
  return `還有 ${dayOffset} 天`
}

function getCancelDeadline(time: string) {
  const [hour, minute] = time.split(':').map(Number)
  const totalMinutes = hour * 60 + minute - CANCEL_BEFORE_MINUTES
  return [Math.floor(totalMinutes / 60), totalMinutes % 60]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
}

function formatCode(date: Date, serial: number, reservationNo?: string) {
  if (reservationNo) return reservationNo
  return `R-${formatDateCode(date)}-${String(serial).padStart(4, '0')}`
}

function createGuestReservation({
  reservationNo,
  date: dateValue,
  time,
  partySize,
  tableNo,
}: ReservationRouteState['reservation']): Reservation {
  const date = parseLocalDate(dateValue)
  const dayOffset = getDayOffset(date)
  const [hours, minutes] = time.split(':').map(Number)
  const startAt = new Date(date)
  startAt.setHours(hours, minutes, 0, 0)

  return {
    serial: Number(reservationNo.replace(/\D/g, '').slice(-4)) || 1,
    reservationNo,
    dayOffset,
    time,
    people: partySize,
    table: `${tableNo} ${partySize} 人桌`,
    status: 'CONFIRMED',
    cancelDeadlinePassed: startAt.getTime() - Date.now() <= CANCEL_BEFORE_MINUTES * 60000,
  }
}
