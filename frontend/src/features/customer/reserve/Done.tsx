import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { SvgIconMap } from '@/assets/SvgIconMap'
import SOButton from '@/components/SOButton'
import { addDays, formatDateWithWeekday, parseLocalDate, startOfToday } from '@/utils/reservationDate'
import type { ReservationConfirmation, ReservationRouteState } from './reservation.types'

function Done() {
  const navigate = useNavigate()
  const location = useLocation()
  const reservation =
    (location.state as ReservationRouteState | null)?.reservation ?? createDemoReservation()
  const [copied, setCopied] = useState(false)
  const date = parseLocalDate(reservation.date)
  const rows = [
    { label: '日期時段', value: `${formatDateWithWeekday(date)} ${reservation.time}` },
    { label: '人數', value: `${reservation.partySize} 位` },
    { label: '桌號', value: formatTable(reservation.tableNo, reservation.partySize) },
  ]

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(reservation.reservationNo)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-paper text-ink-900">
      <main className="min-h-0 flex-1 overflow-y-auto px-page pt-6 pb-28">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-24 items-center justify-center rounded-full bg-success-bg text-success">
            <SvgIconMap.CheckboxCheck aria-hidden="true" className="svg-icon size-13" />
          </div>
          <h1 className="mt-3 type-h1 text-ink-900">訂位完成</h1>
          <p className="mt-1 type-body-sm text-ink-600">到店時報預約編號或手機號碼就可以</p>
        </div>

        <section className="mt-4 rounded-card border border-line bg-surface p-card shadow-card">
          <div className="flex flex-col items-center border-b border-dashed border-line pb-4">
            <span className="type-caption text-ink-600">預約編號</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="type-h2 tracking-widest text-ink-900 tabular-nums">
                {reservation.reservationNo}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="type-caption text-brand-600 underline underline-offset-2"
              >
                {copied ? '已複製' : '複製'}
              </button>
            </div>
          </div>
          <dl className="mt-2">
            {rows.map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between py-2">
                <dt className="type-body-sm text-ink-600">{label}</dt>
                <dd className="type-body font-medium text-ink-900 tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-4 flex gap-3 rounded-btn bg-surface-2 p-page type-body-sm text-ink-600">
          <SvgIconMap.InfoboxCircle
            aria-hidden="true"
            className="svg-icon mt-0.5 size-5 flex-none"
          />
          <div className="flex flex-col gap-1">
            <h2 className="font-bold text-ink-900">取消與修改</h2>
            <p>
              訂位時間前 30 分鐘都可以在「我的預約」<b className="text-ink-900">取消訂位</b>；之後請來電 02-2591-xxxx。
            </p>
            <p className="font-bold text-ink-900">訂位保留 10 分鐘，逾時視同未到，需現場候位。</p>
            {reservation.contact && (
              <p>這支手機記住了你的訂位，換手機或清除瀏覽資料後要查詢請來電。</p>
            )}
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 w-full border-t border-line bg-surface px-page pt-3 pb-6">
        <SOButton
          height="h-13"
          variant="secondary"
          text="查看我的預約"
          onClick={() => navigate('/member/reservations', { state: { reservation } })}
        />
      </div>
    </div>
  )
}

export default Done

function createDemoReservation(): ReservationConfirmation {
  const date = addDays(startOfToday(), 6)
  const dateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  return {
    id: 'RS-DEMO-0043',
    reservationNo: 'R-DEMO-0043',
    date: dateValue,
    time: '18:00',
    partySize: 4,
    tableNo: 'A08',
  }
}

function formatTable(tableNo: string, partySize: number) {
  const area = tableNo.startsWith('C') ? '包廂' : tableNo.startsWith('A') ? '窗邊' : '座位區'
  return `${tableNo}・${area} ${partySize} 人桌`
}
