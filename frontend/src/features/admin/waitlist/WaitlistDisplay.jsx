import { useCallback, useEffect, useRef, useState } from 'react'
import TopBar from '@/components/dashboard/TopBar'
import { fetchWaitlist, parseWaitlistTimestamp } from '@/services/api/waitlist/waitlistApi'
import { useWaitlistSocket } from '@/services/realtime/useWaitlistSocket'

const CALL_EXPIRE_MINUTES = 10

function WaitlistDisplay() {
  const [calledEntries, setCalledEntries] = useState([])
  const [announcement, setAnnouncement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => new Date())
  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const requestControllerRef = useRef(null)
  const announcementIdRef = useRef(0)

  const refreshCalledEntries = useCallback(async ({ manual = false } = {}) => {
    if (!mountedRef.current) return
    const requestId = ++requestIdRef.current
    requestControllerRef.current?.abort()
    const controller = new AbortController()
    requestControllerRef.current = controller
    if (manual) setRefreshing(true)

    try {
      const entries = await fetchWaitlist(controller.signal)
      if (!mountedRef.current || requestId !== requestIdRef.current) return
      setCalledEntries(entries.filter((entry) => entry.status === 'CALLED'))
      setError('')
    } catch (requestError) {
      if (mountedRef.current && !controller.signal.aborted && requestId === requestIdRef.current) {
        setError(requestError.message || '候位叫號資料載入失敗')
      }
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void refreshCalledEntries()
    const refreshTimer = window.setInterval(() => void refreshCalledEntries(), 30_000)
    const clockTimer = window.setInterval(() => setNow(new Date()), 1_000)
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') void refreshCalledEntries()
    }
    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnFocus)
    return () => {
      mountedRef.current = false
      requestIdRef.current += 1
      requestControllerRef.current?.abort()
      window.clearInterval(refreshTimer)
      window.clearInterval(clockTimer)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnFocus)
    }
  }, [refreshCalledEntries])

  useEffect(() => {
    if (!announcement) return undefined
    const timeout = window.setTimeout(() => setAnnouncement(null), 8_000)
    return () => window.clearTimeout(timeout)
  }, [announcement])

  const handleEvent = useCallback((event) => {
    if (event.type === 'WAITLIST_CALLED') {
      announcementIdRef.current += 1
      setAnnouncement({ ...event.payload, id: announcementIdRef.current })
    }
    void refreshCalledEntries()
  }, [refreshCalledEntries])

  const connected = useWaitlistSocket(handleEvent, () => void refreshCalledEntries())
  const liveCalledEntries = calledEntries
    .filter((entry) => calledAtMillis(entry) + CALL_EXPIRE_MINUTES * 60_000 > now.getTime())
    .filter((entry) => Boolean(entry.calledAt))
    .sort((a, b) => calledAtMillis(b) - calledAtMillis(a))

  return (
    <div className="flex h-screen flex-col bg-paper text-ink-900">
      <TopBar
        tag={formatDashboardDate(now)}
        childrenLeft={<span className="type-caption text-ink-600 tabular-nums">現在 {formatTaipeiTime(now)}</span>}
        childrenRight={<SyncIndicator isLive={connected} />}
      />

      <main className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-8 py-10">
        <div className="w-full max-w-5xl">
          <header className="text-center">
            <p className="type-caption font-bold tracking-[0.28em] text-brand-700">鼎沸鍋物・候位叫號</p>
            <h1 className="mt-2 font-serif text-4xl font-black tracking-wide md:text-5xl">請留意叫號</h1>
            <p className="mt-3 text-base text-ink-600">叫到號碼後，請到櫃檯報到</p>
          </header>

          {announcement && (
            <section
              key={announcement.id}
              aria-live="assertive"
              className="mt-9 rounded-card border-2 border-warning-line bg-warning-bg px-6 py-8 text-center shadow-card md:px-10 md:py-10"
            >
              <p className="type-h3 text-hold-ink">現在請 {announcement.ticketNo} 號・{announcement.partySize} 位到櫃檯報到</p>
              <p className="mt-3 font-serif text-7xl font-black tabular-nums text-ink-900 md:text-8xl">{announcement.ticketNo}</p>
            </section>
          )}

          <section className="mt-9 rounded-card border border-line bg-surface p-5 shadow-card md:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="type-h2">已叫號</h2>
              <span className="rounded-pill bg-warning-bg px-3 py-1 type-caption font-medium text-hold-ink">
                {liveCalledEntries.length} 組等候報到
              </span>
              <div className="flex-1" />
              {refreshing && <span className="type-caption text-ink-500">同步中…</span>}
              <button
                type="button"
                onClick={() => void refreshCalledEntries({ manual: true })}
                disabled={refreshing}
                className="rounded-btn px-3 py-2 type-caption font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
              >
                重新整理
              </button>
            </div>

            {error && (
              <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-btn bg-danger-bg px-4 py-3 text-sm text-danger-ink">
                <span className="min-w-0 flex-1">候位資料同步失敗：{error}</span>
                <button
                  type="button"
                  onClick={() => void refreshCalledEntries({ manual: true })}
                  disabled={refreshing}
                  className="font-medium underline disabled:opacity-50"
                >
                  重試
                </button>
              </div>
            )}

            {loading ? (
              <p className="py-16 text-center text-ink-500">候位叫號載入中…</p>
            ) : error && liveCalledEntries.length === 0 ? (
              <p className="py-12 text-center text-ink-500">目前無法確認叫號狀態，請等候同步或按重試。</p>
            ) : liveCalledEntries.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-serif text-3xl font-bold text-ink-400">目前沒有叫號</p>
                <p className="mt-2 type-body-sm text-ink-500">請稍候，叫號後會即時顯示在這裡。</p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {liveCalledEntries.map((entry) => (
                  <article
                    key={entry.id}
                    className={`rounded-card px-5 py-6 text-center ${announcement?.ticketNo === entry.ticketNo ? 'bg-warning-bg ring-2 ring-warning-line' : 'bg-surface-2'}`}
                  >
                    <p className="font-serif text-5xl font-black tabular-nums text-ink-900">{entry.ticketNo}</p>
                    <p className="mt-2 text-lg font-medium text-ink-700">{entry.partySize} 位・請到櫃檯報到</p>
                    <p className="mt-2 type-caption text-ink-500">叫號 {formatTaipeiTime(entry.calledAt)}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function formatDashboardDate(date) {
  const parts = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', weekday: 'short',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `今天 ${values.month}/${values.day}（${values.weekday.replace(/^週/, '')}）`
}

function formatTaipeiTime(value) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(value instanceof Date ? value : parseWaitlistTimestamp(value))
}

function calledAtMillis(entry) {
  return entry.calledAt ? parseWaitlistTimestamp(entry.calledAt).getTime() : 0
}

function SyncIndicator({ isLive }) {
  return (
    <span className={`type-caption ${isLive ? 'text-success' : 'text-hold-ink'}`}>
      {isLive ? '即時同步中' : '連線中斷，重新連線中'}
    </span>
  )
}

export default WaitlistDisplay
