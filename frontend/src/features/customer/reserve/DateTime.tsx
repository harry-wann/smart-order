import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { SvgIconMap } from '@/assets/SvgIconMap'
import CustomerTopBar from '@/components/CustomerTopBar'
import SOButton from '@/components/SOButton'
import { addDays, formatDateWithWeekday, startOfToday } from '@/utils/reservationDate'
import type { ReservationContact, ReservationRouteState } from './reservation.types'

function DateTime() {
  const navigate = useNavigate()
  const location = useLocation()
  const [dayOffset, setDayOffset] = useState(1)
  const [time, setTime] = useState<string | null>('18:00')
  const [people, setPeople] = useState(4)

  const today = startOfToday()
  const fullSlots = getFullSlots(dayOffset)
  const summary = time
    ? `${formatDateWithWeekday(addDays(today, dayOffset))}${time}・${people} 位`
    : '請選擇時段'
  const contact = (location.state as { contact?: ReservationContact } | null)?.contact

  const handleSelectDay = (offset: number) => {
    setDayOffset(offset)
    if (time && getFullSlots(offset).includes(time)) setTime(null)
  }

  function handleConfirm() {
    if (!time) return
    const selectedDate = addDays(today, dayOffset)
    const date = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    const reservationNo = `RS${date.replaceAll('-', '')}${time.replace(':', '')}`

    const reservation: ReservationRouteState['reservation'] = {
      id: reservationNo,
      reservationNo,
      date,
      time,
      partySize: people,
      tableNo: people <= 4 ? 'A08' : 'C02',
      contact,
    }

    navigate('/reserve/done', { state: { reservation } satisfies ReservationRouteState })
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
          <div className="flex gap-2">
            {TIME_SLOTS.map((slot) => (
              <TimeSlot
                key={slot}
                time={slot}
                full={fullSlots.includes(slot)}
                selected={slot === time}
                onSelect={() => setTime(slot)}
              />
            ))}
          </div>
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
                onClick={() => setPeople((count) => count - 1)}
                className={STEP_BUTTON_CLASS}
              >
                <SvgIconMap.CounterMinus aria-hidden="true" />
              </button>
              <span className="w-18 text-center type-display text-ink-900">{people}</span>
              <button
                type="button"
                aria-label="增加人數"
                disabled={people >= MAX_PEOPLE}
                onClick={() => setPeople((count) => count + 1)}
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
        <SOButton
          height="h-13"
          text={['確認訂位', summary]}
          disabled={time === null}
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
const MAX_PEOPLE = 10
const TIME_SLOTS = ['17:00', '17:30', '18:00', '18:30', '19:00']

const FULL_SLOTS_BY_OFFSET: Record<number, string[]> = {
  1: ['18:30'],
  2: ['18:00', '18:30'],
  4: TIME_SLOTS,
  7: ['19:00'],
}

const STEP_BUTTON_CLASS =
  'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[1.5px] border-brand-600 bg-surface disabled:cursor-not-allowed disabled:opacity-40'

function getFullSlots(dayOffset: number) {
  return FULL_SLOTS_BY_OFFSET[dayOffset] ?? []
}

function getTableLabel(people: number) {
  if (people <= 2) return '2 人桌・靠牆區'
  if (people <= 4) return '4 人桌・窗邊區'
  if (people <= 6) return '6 人桌・中央區'
  return '10 人包廂'
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
