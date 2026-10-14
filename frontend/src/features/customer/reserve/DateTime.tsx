import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { SvgIconMap } from '@/assets/SvgIconMap'
import CustomerTopBar from '@/components/CustomerTopBar'
import SOButton from '@/components/SOButton'
import { useCreateReservation } from '@/hooks/reservation/useReservationMutations'
import { useAvailability } from '@/hooks/reservation/useReservationQueries'
import type { ReservationCreated } from '@/services/api/reservation/types'
import { isApiError } from '@/services/client/ApiError'
import { addDays, formatDateWithWeekday, startOfToday } from '@/utils/reservationDate'
import type { ReservationContact, ReservationRouteState } from './reservation.types'

function DateTime() {
  const navigate = useNavigate()
  const location = useLocation()
  const [dayOffset, setDayOffset] = useState(1)
  const [time, setTime] = useState<string | null>(null)
  const [people, setPeople] = useState(4)
  const [notice, setNotice] = useState<string | null>(null)
  const createReservation = useCreateReservation()

  const today = startOfToday()
  const date = toDateParam(addDays(today, dayOffset))
  const availability = useAvailability(date, people)
  const slots = availability.data?.slots ?? []
  const fullSlots = slots.filter((slot) => !slot.available).map((slot) => slot.time)
  // 換日期或人數後，原本選的時段可能變成已額滿，就當作還沒選
  const selectedTime = time !== null && !fullSlots.includes(time) ? time : null
  const summary = selectedTime
    ? `${formatDateWithWeekday(addDays(today, dayOffset))}${selectedTime}・${people} 位`
    : '請選擇時段'
  const routeState = location.state as
    | { contact?: ReservationContact; reservationType?: 'GUEST' | 'MEMBER' }
    | null
  const contact = routeState?.contact
  const reservationType = routeState?.reservationType ?? (contact ? 'GUEST' : undefined)

  // 沒有聯絡資料也不是會員，代表是直接打網址進來的，回到訂位入口重選
  if (!reservationType) return <Navigate to="/reserve" replace />

  function handleChangePeople(next: number) {
    setPeople(next)
    setNotice(null)
  }

  function handleSelectDay(offset: number) {
    setDayOffset(offset)
    setNotice(null)
  }

  function handleConfirm() {
    if (!selectedTime || !reservationType) return
    setNotice(null)
    createReservation.mutate(
      {
        asMember: reservationType === 'MEMBER',
        startTime: `${date}T${selectedTime}:00+08:00`,
        adultCount: people,
        childCount: 0,
        contactName: contact?.name,
        contactPhone: contact?.phone,
        contactEmail: contact?.email || null,
      },
      {
        onSuccess: (created) => {
          const reservation = toConfirmation(created, people, reservationType, contact)
          navigate(`/reserve/${created.reservationId}/done`, {
            state: { reservation } satisfies ReservationRouteState,
          })
        },
        onError: (error) => {
          // 客滿：留在本頁，時段重抓後會標成已額滿
          if (isApiError(error, 'SLOT_UNAVAILABLE')) setTime(null)
          setNotice(error.message)
        },
      },
    )
  }

  return (
    <div className="flex min-h-full w-full flex-col">
      <CustomerTopBar title="線上訂位" showBackButton={true} />

      <div className="h-30 w-full shrink-0 bg-surface-2" />

      <div className="flex flex-col gap-6 p-page pb-28">
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="type-h3 text-ink-900">{getMonthLabel(today)}</h2>
            <span className="type-caption text-ink-600">可訂 明天起 {BOOKABLE_DAYS} 天內</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="py-1 text-center type-caption text-ink-600">
                {weekday}
              </span>
            ))}
            {buildCalendarDays(today).map(({ offset, date, available }) => (
              <CalendarDay
                key={offset}
                day={date.getDate()}
                available={available}
                selected={offset === dayOffset}
                onSelect={() => handleSelectDay(offset)}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="type-h3 text-ink-900">時段</h2>
            <span className="type-caption text-ink-600">用餐時間 {DINING_MINUTES} 分鐘</span>
          </div>
          {availability.isError ? (
            <p className="type-body-sm text-danger">{availability.error.message}</p>
          ) : availability.isPending ? (
            <p className="type-body-sm text-ink-600">時段載入中…</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => (
                <TimeSlot
                  key={slot.time}
                  time={slot.time}
                  full={!slot.available}
                  selected={slot.time === selectedTime}
                  onSelect={() => {
                    setTime(slot.time)
                    setNotice(null)
                  }}
                />
              ))}
            </div>
          )}
          {fullSlots.length > 0 && (
            <p className="type-caption text-ink-600">
              {fullSlots.join('、')} 已額滿。虛線框的時段不能點。
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="type-h3 text-ink-900">人數</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="減少人數"
                disabled={people <= MIN_PEOPLE}
                onClick={() => handleChangePeople(people - 1)}
                className={STEP_BUTTON_CLASS}
              >
                <SvgIconMap.CounterMinus aria-hidden="true" />
              </button>
              <span className="w-18 text-center type-display text-ink-900">{people}</span>
              <button
                type="button"
                aria-label="增加人數"
                disabled={people >= MAX_PEOPLE}
                onClick={() => handleChangePeople(people + 1)}
                className={STEP_BUTTON_CLASS}
              >
                <SvgIconMap.CounterPlus aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col type-body-sm text-ink-600">
              <span>將為您安排</span>
              <span className="font-bold text-ink-900">{getTableLabel(people)}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 w-full border-t border-line bg-surface px-page pt-3 pb-6">
        {notice && <p className="pb-2 text-center type-body-sm text-danger">{notice}</p>}
        <SOButton
          height="h-13"
          text={createReservation.isPending ? '處理中…' : ['確認訂位', summary]}
          disabled={selectedTime === null || createReservation.isPending}
          onClick={handleConfirm}
        />
      </div>
    </div>
  )
}

export default DateTime

type CalendarDayProps = {
  day: number
  available: boolean
  selected: boolean
  onSelect: () => void
}

function CalendarDay({ day, available, selected, onSelect }: CalendarDayProps) {
  return (
    <button
      type="button"
      disabled={!available}
      aria-pressed={selected}
      onClick={onSelect}
      className={[
        'flex h-10.5 items-center justify-center rounded-btn border type-body tabular-nums',
        !available
          ? 'border-transparent text-ink-400'
          : selected
            ? 'border-brand-600 bg-brand-600 font-bold text-surface'
            : 'border-line bg-surface text-ink-900',
      ].join(' ')}
    >
      {day}
    </button>
  )
}

type TimeSlotProps = {
  time: string
  full: boolean
  selected: boolean
  onSelect: () => void
}

function TimeSlot({ time, full, selected, onSelect }: TimeSlotProps) {
  return (
    <button
      type="button"
      disabled={full}
      aria-pressed={selected}
      onClick={onSelect}
      className={[
        'flex h-14 flex-1 flex-col items-center justify-center rounded-btn border type-body tabular-nums',
        full
          ? 'cursor-not-allowed border-dashed border-line bg-surface-2 text-ink-400'
          : selected
            ? 'border-brand-600 bg-brand-600 font-bold text-surface'
            : 'border-line bg-surface text-ink-900',
      ].join(' ')}
    >
      <span>{time}</span>
      {full && <span className="type-caption text-ink-600">已額滿</span>}
    </button>
  )
}

type CalendarDayData = {
  offset: number
  date: Date
  available: boolean
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const BOOKABLE_DAYS = 30
const DINING_MINUTES = 100
const MIN_PEOPLE = 1
// 開放線上訂位的桌最大是 8 人包廂
const MAX_PEOPLE = 8
const TABLE_SIZES = [2, 4, 6, 8]

const STEP_BUTTON_CLASS =
  'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[1.5px] border-brand-600 bg-surface disabled:cursor-not-allowed disabled:opacity-40'

// 後端挑「坐得下的桌裡座位最少的」，畫面先用同樣的規則預告桌型
function getTableLabel(people: number) {
  const seats = TABLE_SIZES.find((size) => size >= people) ?? MAX_PEOPLE
  return seats === MAX_PEOPLE ? `${seats} 人包廂` : `${seats} 人桌`
}

function toDateParam(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function toConfirmation(
  created: ReservationCreated,
  partySize: number,
  reservationType: 'GUEST' | 'MEMBER',
  contact?: ReservationContact,
): ReservationRouteState['reservation'] {
  const [date, rest] = created.startTime.split('T')
  return {
    id: String(created.reservationId),
    reservationNo: created.reservationNo,
    accessToken: created.accessToken,
    date,
    time: rest.slice(0, 5),
    partySize,
    tableNo: created.tableNo,
    reservationType,
    contact,
  }
}

function getMonthLabel(today: Date) {
  const startMonth = addDays(today, 1).getMonth() + 1
  const endMonth = addDays(today, BOOKABLE_DAYS).getMonth() + 1
  return startMonth === endMonth ? `${startMonth} 月` : `${startMonth} 月 - ${endMonth} 月`
}

function buildCalendarDays(today: Date): CalendarDayData[] {
  const firstOffset = 1 - addDays(today, 1).getDay()
  const lastOffset = BOOKABLE_DAYS + 6 - addDays(today, BOOKABLE_DAYS).getDay()

  return Array.from({ length: lastOffset - firstOffset + 1 }, (_, index) => {
    const offset = firstOffset + index
    return {
      offset,
      date: addDays(today, offset),
      available: offset >= 1 && offset <= BOOKABLE_DAYS,
    }
  })
}
