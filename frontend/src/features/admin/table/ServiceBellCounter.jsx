import { useEffect, useRef, useState } from 'react'
import { SvgIconMap } from '@/assets/SvgIconMap'
import { useTableStatusSocket } from '@/services/realtime/useTableStatusSocket'

const BELL_LABELS = { CALL_WAITER: '呼叫服務生', ADD_SOUP: '加湯', CHANGE_POT: '換鍋撈渣' }
const BELL_STORAGE_KEY = 'smartorder.serviceBell'

function todayKey() {
  return new Date().toLocaleDateString('sv-SE')
}

function loadBell() {
  try {
    const saved = JSON.parse(localStorage.getItem(BELL_STORAGE_KEY))
    if (saved?.date === todayKey()) return saved
  } catch {}
  return { calls: [], doneCalls: [] }
}

function BellCall({ call, now, onDone }) {
  const isDone = !onDone
  const minutesAgo = Math.floor((now - (isDone ? call.doneAt : call.receivedAt)) / 60000)
  const timeText = minutesAgo < 1 ? '剛剛' : `${minutesAgo} 分鐘前`

  return (
    <div className={`flex h-16 shrink-0 items-center gap-3 px-4 ${isDone ? 'bg-surface-2 opacity-60' : ''}`}>
      <span className="w-11 shrink-0 type-body font-bold text-ink-900 tabular-nums">{call.tableNo}</span>

      <div className="flex-1">
        <p className="type-body-sm font-bold text-ink-900">{BELL_LABELS[call.request] ?? call.request}</p>
        <p className="type-caption text-ink-600 tabular-nums">{isDone ? `${timeText}處理` : timeText}</p>
      </div>

      {!isDone && (
        <button
          onClick={() => onDone(call.id)}
          className="inline-flex h-9 items-center rounded-btn bg-surface px-3.5 type-body-sm font-medium text-brand-600 shadow-[inset_0_0_0_1.5px_var(--color-brand-600)] hover:bg-brand-100"
        >
          已處理
        </button>
      )}
    </div>
  )
}

function ServiceBellCounter() {
  const [calls, setCalls] = useState(() => loadBell().calls)              
  const [doneCalls, setDoneCalls] = useState(() => loadBell().doneCalls)  
  const [isOpen, setIsOpen] = useState(false)                             
  const [now, setNow] = useState(Date.now())                             
  const dayRef = useRef(todayKey())                                       

  useTableStatusSocket(
    () => {},
    (data) => {
      setCalls((prev) => {
        const exists = prev.some((c) => c.tableNo === data.tableNo && c.request === data.request)
        if (exists) return prev 
        return [...prev, { ...data, receivedAt: Date.now() }]
      })
      setIsOpen(true)
    }
  )

  useEffect(() => {
    try {
      localStorage.setItem(BELL_STORAGE_KEY, JSON.stringify({ date: todayKey(), calls, doneCalls }))
    } catch {}
  }, [calls, doneCalls])

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
      if (todayKey() !== dayRef.current) {
        dayRef.current = todayKey()
        setCalls([])
        setDoneCalls([])
      }
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  function handleDone(id) {
    const call = calls.find((c) => c.id === id)
    if (!call) return
    setCalls((prev) => prev.filter((c) => c.id !== id))
    setDoneCalls((prev) => [{ ...call, doneAt: Date.now() }, ...prev])
  }

  return (
    <>
      <button
        type="button"
        aria-label="服務鈴"
        onClick={() => setIsOpen((o) => !o)}
        className="relative flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
      >
        <SvgIconMap.TableOverviewBell className="size-5.5" />
        {calls.length > 0 && (
          <span className="absolute top-0.5 right-0.5 flex min-w-5 items-center justify-center rounded-pill bg-danger px-1 type-caption text-white tabular-nums">
            {calls.length}
          </span>
        )}
      </button>

      {isOpen && (
        <section className="fixed top-20 right-6 z-40 flex w-80 flex-col overflow-hidden rounded-card border border-line bg-surface shadow-pop">
          <div className="flex shrink-0 items-center gap-2 bg-surface-2 px-4 py-3 type-body-sm font-bold text-ink-900">
            <SvgIconMap.TableOverviewBell className="size-4.5" />
            服務鈴
            <div className="flex-1" />
            <span className="rounded-pill bg-danger px-2.5 py-0.5 type-caption text-white">{calls.length}</span>
          </div>

          <div className="max-h-[194px] divide-y divide-line overflow-y-auto border-t border-line">
            {calls.length === 0 ? (
              <p className="px-4 py-6 text-center type-caption text-ink-600">目前沒有呼叫</p>
            ) : (
              calls.map((call) => <BellCall key={call.id} call={call} now={now} onDone={handleDone} />)
            )}
          </div>

          <p className="shrink-0 border-y border-line bg-surface-2 px-4 py-2 text-center type-caption text-ink-600">
            今天已處理 {doneCalls.length} 則
          </p>

          <div className="max-h-[194px] divide-y divide-line overflow-y-auto">
            {doneCalls.length === 0 ? (
              <p className="px-4 py-6 text-center type-caption text-ink-600">還沒有處理紀錄</p>
            ) : (
              doneCalls.map((call) => <BellCall key={call.id} call={call} now={now} />)
            )}
          </div>
        </section>
      )}
    </>
  )
}

export default ServiceBellCounter