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
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

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

  useEffect(() => {
    if (!isOpen) return undefined
    const previouslyFocused = document.activeElement
    const panel = panelRef.current
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const getFocusable = () =>
      Array.from(panel?.querySelectorAll(focusableSelector) ?? []).filter(
        (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
      )

    panel?.querySelector('button:not([disabled])')?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const focusable = getFocusable()
      if (focusable.length === 0) {
        event.preventDefault()
        panel?.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!panel?.contains(document.activeElement)) {
        event.preventDefault()
        const target = event.shiftKey ? last : first
        target.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus()
      } else {
        triggerRef.current?.focus()
      }
    }
  }, [isOpen])

  function handleDone(id) {
    const call = calls.find((c) => c.id === id)
    if (!call) return
    setCalls((prev) => prev.filter((c) => c.id !== id))
    setDoneCalls((prev) => [{ ...call, doneAt: Date.now() }, ...prev])
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="服務鈴"
        aria-expanded={isOpen}
        aria-controls="service-bell-panel"
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
        <>
          <button
            type="button"
            aria-label="關閉服務鈴"
            tabIndex={-1}
            className="fixed inset-0 z-40 bg-ink-900/30"
            onClick={() => setIsOpen(false)}
          />
          <section
            ref={panelRef}
            id="service-bell-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-bell-title"
            tabIndex={-1}
            className="fixed top-16 right-3 z-50 flex max-h-[calc(100dvh-5rem)] w-80 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-pop sm:right-6"
          >
            <div className="flex shrink-0 items-center gap-2 bg-surface-2 px-4 py-3 type-body-sm font-bold text-ink-900">
              <SvgIconMap.TableOverviewBell className="size-4.5" />
              <h2 id="service-bell-title" className="type-body-sm font-bold">
                服務鈴
              </h2>
              <div className="flex-1" />
              <span className="rounded-pill bg-danger px-2.5 py-0.5 type-caption text-white">
                {calls.length}
              </span>
              <button
                type="button"
                aria-label="關閉服務鈴"
                onClick={() => setIsOpen(false)}
                className="flex size-8 items-center justify-center rounded-full type-body hover:bg-ink-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                ×
              </button>
            </div>

            <div className="max-h-[194px] divide-y divide-line overflow-y-auto border-t border-line">
              {calls.length === 0 ? (
                <p className="px-4 py-6 text-center type-caption text-ink-600">目前沒有呼叫</p>
              ) : (
                calls.map((call) => (
                  <BellCall key={call.id} call={call} now={now} onDone={handleDone} />
                ))
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
        </>
      )}
    </>
  )
}

export default ServiceBellCounter
