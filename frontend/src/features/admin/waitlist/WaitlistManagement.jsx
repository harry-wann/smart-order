import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import SOButton from '@/components/SOButton'
import TopBar from '@/components/dashboard/TopBar'
import { SvgIconMap } from '@/assets/SvgIconMap'
import { adminReservationKeys } from '@/hooks/reservation/useAdminReservations'
import WaitlistSeatDialog from './WaitlistSeatDialog'
import {
  abandonWaitlist,
  callWaitlist,
  fetchWaitlist,
  fetchWaitlistTodaySummary,
  parseWaitlistTimestamp,
  recallWaitlist,
  registerWaitlist,
  seatWaitlist,
} from '@/services/api/waitlist/waitlistApi'
import { useWaitlistSocket } from '@/services/realtime/useWaitlistSocket'

const CALL_EXPIRE_MINUTES = 10
const BADGE_BASE = 'inline-flex items-center whitespace-nowrap rounded-pill px-2.5 py-0.5 text-xs font-medium'
const STATUS_BADGE = {
  WAITING: 'bg-info-bg text-info-ink ring-1 ring-inset ring-info-line',
  CALLED: 'bg-warning-bg text-hold-ink ring-1 ring-inset ring-warning-line',
}
const STATUS_ORDER = { CALLED: 0, WAITING: 1 }
// 候位本身已經結束（被別台入座、放棄或過號）時，選桌對話框沒有意義，直接關掉
const SEAT_ENTRY_CLOSED_CODES = ['WAITLIST_STATUS', 'WAITLIST_EXPIRED']

function WaitlistManagement() {
  const queryClient = useQueryClient()
  const [waitlist, setWaitlist] = useState([])
  const [summary, setSummary] = useState(null)
  const [listLoading, setListLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [summaryError, setSummaryError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [actionError, setActionError] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [registering, setRegistering] = useState(false)
  const [busyEntries, setBusyEntries] = useState({})
  const [now, setNow] = useState(() => new Date())
  const [seatingEntry, setSeatingEntry] = useState(null)
  const [name, setName] = useState('')
  const [phoneLast4, setPhoneLast4] = useState('')
  const [partySize, setPartySize] = useState(2)

  const mountedRef = useRef(true)
  const refreshGenerationRef = useRef(0)
  const refreshControllerRef = useRef(null)
  const busyEntryIdsRef = useRef(new Set())
  const registerLockRef = useRef(false)

  const refreshAll = useCallback(async ({ manual = false } = {}) => {
    if (!mountedRef.current) return
    const generation = ++refreshGenerationRef.current
    refreshControllerRef.current?.abort()
    const controller = new AbortController()
    refreshControllerRef.current = controller
    if (manual) setRefreshing(true)

    const [listResult, summaryResult] = await Promise.allSettled([
      fetchWaitlist(controller.signal),
      fetchWaitlistTodaySummary(controller.signal),
    ])

    if (!mountedRef.current || generation !== refreshGenerationRef.current) return
    if (listResult.status === 'fulfilled') {
      setWaitlist(listResult.value.map(toWaitlistRow))
      setListError('')
    } else if (!controller.signal.aborted) {
      setListError(listResult.reason?.message ?? '候位清單載入失敗')
    }
    if (summaryResult.status === 'fulfilled') {
      setSummary(summaryResult.value)
      setSummaryError('')
    } else if (!controller.signal.aborted) {
      setSummaryError(summaryResult.reason?.message ?? '今日統計載入失敗')
    }
    setListLoading(false)
    setSummaryLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void refreshAll()
    const refreshTimer = window.setInterval(() => void refreshAll(), 30_000)
    const clockTimer = window.setInterval(() => setNow(new Date()), 15_000)
    return () => {
      mountedRef.current = false
      refreshGenerationRef.current += 1
      refreshControllerRef.current?.abort()
      window.clearInterval(refreshTimer)
      window.clearInterval(clockTimer)
    }
  }, [refreshAll])

  const handleWaitlistEvent = useCallback(() => {
    void refreshAll()
  }, [refreshAll])
  const connected = useWaitlistSocket(handleWaitlistEvent, handleWaitlistEvent)

  const minutesSince = (date) => Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000))
  const canSubmit = name.trim() !== '' && /^\d{4}$/.test(phoneLast4) && partySize >= 1 && partySize <= 20

  async function handleTakeNumber() {
    if (!canSubmit || registerLockRef.current) return
    registerLockRef.current = true
    setRegistering(true)
    setRegisterError('')
    try {
      const created = await registerWaitlist(name.trim(), phoneLast4, partySize)
      if (!mountedRef.current) return
      setWaitlist((previous) => [...previous, toWaitlistRow(created)])
      setName('')
      setPhoneLast4('')
      setPartySize(2)
      await refreshAll()
    } catch (error) {
      if (mountedRef.current) setRegisterError(`取號失敗：${error?.message ?? '請稍後重試'}`)
    } finally {
      registerLockRef.current = false
      if (mountedRef.current) setRegistering(false)
    }
  }

  function handleRetry() {
    setActionError('')
    void refreshAll({ manual: true })
  }

  function setEntryBusy(id, isBusy) {
    if (!mountedRef.current) return
    setBusyEntries((previous) => {
      const next = { ...previous }
      if (isBusy) next[id] = true
      else delete next[id]
      return next
    })
  }

  function updateEntry(entry) {
    if (!mountedRef.current) return
    setWaitlist((previous) => previous.map((row) => (row.id === entry.id ? toWaitlistRow(entry) : row)))
  }

  async function runEntryAction(id, action, operation, onError) {
    if (busyEntryIdsRef.current.has(id)) return null
    busyEntryIdsRef.current.add(id)
    setEntryBusy(id, true)
    setActionError('')
    try {
      const result = await operation()
      if (!mountedRef.current) return result
      if (action === 'remove') setWaitlist((previous) => previous.filter((entry) => entry.id !== id))
      else if (result) updateEntry(result)
      await refreshAll()
      return result
    } catch (error) {
      if (mountedRef.current) {
        setActionError(
          error?.code === 'TABLE_RESERVED'
            ? '所選桌位剛保留給已預約客人，請重新選桌。'
            : (error?.message || '候位操作失敗，請重試。'),
        )
        onError?.(error)
      }
      await refreshAll()
      return null
    } finally {
      busyEntryIdsRef.current.delete(id)
      setEntryBusy(id, false)
    }
  }

  function handleCall(id) {
    return runEntryAction(id, 'update', () => callWaitlist(id))
  }

  function handleRecall(id) {
    return runEntryAction(id, 'update', () => recallWaitlist(id))
  }

  function handleAbandon(id) {
    return runEntryAction(id, 'remove', () => abandonWaitlist(id))
  }

  function handleCheckIn(entry) {
    if (entry.status === 'CALLED' && isCallStillValid(entry, now)) {
      setActionError('')
      setSeatingEntry(entry)
    }
  }

  async function handleSeat(tableId) {
    if (!seatingEntry) return
    const entry = seatingEntry
    const result = await runEntryAction(entry.id, 'remove', () => seatWaitlist(entry.id, tableId), (error) => {
      // 桌子可能剛被別台開走：重抓空桌清單，不讓店員對同一張桌一直重送
      void queryClient.invalidateQueries({ queryKey: adminReservationKeys.tables })
      if (SEAT_ENTRY_CLOSED_CODES.includes(error?.code)) setSeatingEntry(null)
    })
    if (result && mountedRef.current) setSeatingEntry(null)
  }

  // 「候位中／待報到」跟清單同一個來源（不限登記日期）；「平均等待／今日過號」才用今日統計
  const calledCount = waitlist.filter((entry) => entry.status === 'CALLED').length
  const sortedList = [...waitlist].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.createdAt.getTime() - a.createdAt.getTime(),
  )
  const todayLabel = formatDashboardDate(now)

  return (
    <div className="flex h-full flex-col bg-paper text-ink-900">
      <TopBar
        tag={todayLabel}
        childrenLeft={
          <span className="type-caption text-ink-600 tabular-nums">現在 {formatTaipeiTime(now)}</span>
        }
        childrenRight={
          <>
            {/* 開在另一個視窗，櫃檯的管理頁保留著；重按會回到同一個螢幕視窗 */}
            <button
              type="button"
              onClick={() => window.open('/admin/waitlist/display', 'waitlist-display')}
              className="h-11 rounded-btn border border-line bg-surface px-5 text-base leading-none font-medium text-ink-700 hover:bg-surface-2"
            >
              開啟候位叫號螢幕
            </button>
            <SyncIndicator isLive={connected} />
          </>
        }
      />

      {/* 1280px 以下側欄占掉寬度，登記表單改成橫排放在上方；以上維持左右兩欄 */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-6 xl:flex-row xl:items-start">
        <div className="flex w-full flex-none flex-col gap-4 xl:w-80">
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="type-h3">現場登記</h2>
            <p className="mt-1 mb-4 type-caption text-ink-600">留末四碼就好，不留全號碼</p>

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_minmax(0,140px)] items-end gap-4 xl:block">
              <label className="block xl:mb-4">
                <span className="mb-2 block text-sm font-bold text-ink-600">怎麼稱呼</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例如：陳"
                  disabled={registering}
                  className="h-12 w-full rounded-btn border border-line bg-surface px-4 text-base text-ink-900 outline-none placeholder:text-ink-400 focus:border-transparent focus:ring-[1.5px] focus:ring-brand-600 focus:ring-inset"
                />
              </label>

              <label className="block xl:mb-4">
                <span className="mb-2 block text-sm font-bold text-ink-600">電話末四碼</span>
                <input
                  value={phoneLast4}
                  onChange={(event) => setPhoneLast4(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  placeholder="0000"
                  disabled={registering}
                  className="h-12 w-full rounded-btn border border-line bg-surface px-4 text-base text-ink-900 tabular-nums outline-none placeholder:text-ink-400 focus:border-transparent focus:ring-[1.5px] focus:ring-brand-600 focus:ring-inset"
                />
              </label>

              <div className="xl:mb-4">
                <span className="mb-2 block text-sm font-bold text-ink-600">人數</span>
                <div className="flex items-center gap-4">
                  <StepButton
                    label="減少人數"
                    onClick={() => setPartySize((size) => Math.max(1, size - 1))}
                    disabled={partySize <= 1 || registering}
                  >
                    −
                  </StepButton>
                  <span className="w-18 text-center font-serif text-[40px] leading-none font-black tabular-nums">
                    {partySize}
                  </span>
                  <StepButton
                    label="增加人數"
                    onClick={() => setPartySize((size) => Math.min(20, size + 1))}
                    disabled={partySize >= 20 || registering}
                  >
                    ＋
                  </StepButton>
                </div>
              </div>

              <div>
                <SOButton
                  height="h-13"
                  text={registering ? '取號中…' : '取號'}
                  disabled={!canSubmit || registering}
                  onClick={handleTakeNumber}
                />
              </div>
            </div>
            {registerError && <p role="alert" className="mt-3 text-sm text-danger">{registerError}</p>}
          </section>

          <div className="flex gap-2 rounded-btn bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-600">
            <SvgIconMap.ToastInfo aria-hidden="true" className="mt-0.5 size-4 flex-none" />
            <p>
              叫號後 {CALL_EXPIRE_MINUTES} 分鐘沒報到，排程自動標成過號。
              <br />
              只有「已叫號」會被標，「等待中」不會。
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <section className="flex min-h-18 flex-wrap items-center gap-6 rounded-card border border-line bg-surface px-5 py-4">
            <Stat
              value={listLoading ? '…' : listError && waitlist.length === 0 ? '—' : waitlist.length}
              label="組候位中"
              valueClass="text-brand-600"
            />
            <Divider />
            <Stat
              value={listLoading ? '…' : listError && waitlist.length === 0 ? '—' : calledCount}
              label="已叫號待報到"
              valueClass="text-warning"
            />
            <Divider />
            <Stat
              value={summaryLoading ? '…' : summary ? Math.round(summary.averageWaitMinutes) : '—'}
              label="分・平均等待"
            />
            <Divider />
            <Stat value={summaryLoading ? '…' : summary?.expiredCount ?? '—'} label="今日過號" />
            <div className="ml-auto flex items-center gap-2">
              {refreshing && <span className="type-caption text-ink-500">同步中…</span>}
              <button
                type="button"
                onClick={handleRetry}
                disabled={refreshing}
                className="h-9 rounded-btn px-3 type-caption text-brand-700 hover:bg-brand-100 disabled:opacity-50"
              >
                重新整理
              </button>
            </div>
          </section>

          {(listError || summaryError || actionError) && (
            <div role="alert" className="flex flex-wrap items-center gap-2 rounded-card border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger-ink">
              <span className="min-w-0 flex-1">
                {actionError || [listError && `候位清單同步失敗：${listError}`, summaryError && `今日統計同步失敗：${summaryError}`]
                  .filter(Boolean)
                  .join('；')}
              </span>
              <button
                type="button"
                onClick={handleRetry}
                disabled={refreshing}
                className="rounded-btn px-3 py-1 font-medium text-danger-ink underline disabled:opacity-50"
              >
                重試
              </button>
            </div>
          )}

          <div className="overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-[13px] font-bold tracking-wide whitespace-nowrap text-ink-600">
                <tr>
                  <th className="w-[64px] border-b border-line px-3 py-3 xl:px-4">號碼</th>
                  <th className="border-b border-line px-3 py-3 xl:px-4">客人</th>
                  <th className="w-[64px] border-b border-line px-3 py-3 xl:px-4">人數</th>
                  <th className="w-[104px] border-b border-line px-3 py-3 xl:px-4">等待</th>
                  <th className="w-[112px] border-b border-line px-3 py-3 xl:px-4">狀態</th>
                  <th className="w-[204px] border-b border-line px-3 py-3 xl:px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-500">候位清單載入中…</td></tr>
                ) : listError && waitlist.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-danger">讀不到候位清單，請按重試。</td></tr>
                ) : sortedList.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-500">目前沒有等待中或已叫號的候位。</td></tr>
                ) : sortedList.map((entry) => {
                  const isCalled = entry.status === 'CALLED'
                  const isBusy = Boolean(busyEntries[entry.id])
                  const callValid = isCalled && isCallStillValid(entry, now)
                  const remainingMinutes = isCalled && entry.calledAt
                    ? Math.max(0, Math.ceil((entry.calledAt.getTime() + CALL_EXPIRE_MINUTES * 60_000 - now.getTime()) / 60_000))
                    : null

                  return (
                    <tr key={entry.id} className={`border-b border-line last:border-b-0 ${isCalled ? 'bg-warning-bg' : ''}`}>
                      <td className="px-3 py-3 text-[17px] font-bold tabular-nums xl:px-4">{entry.no}</td>
                      <td className="px-3 py-3 xl:px-4">
                        <b className="text-[15px] break-all">{entry.name}</b>
                        <div className="type-caption whitespace-nowrap text-ink-600 tabular-nums">末四碼 {entry.phoneLast4}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap tabular-nums xl:px-4">{entry.partySize} 位</td>
                      <td className="px-3 py-3 whitespace-nowrap tabular-nums xl:px-4">
                        已等 {minutesSince(entry.createdAt)} 分
                        <div className="type-caption text-ink-600">{formatTaipeiTime(entry.createdAt)} 登記</div>
                      </td>
                      <td className="px-3 py-3 xl:px-4">
                        <span className={`${BADGE_BASE} ${STATUS_BADGE[entry.status]}`}>{isCalled ? '已叫號' : '等待中'}</span>
                        {isCalled && (
                          <div className={`type-caption ${callValid ? 'text-ink-600' : 'font-medium text-danger'}`}>
                            {callValid ? `剩 ${remainingMinutes} 分` : '報到期限已過，等待過號同步'}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 xl:px-4">
                        {isCalled && callValid && (
                          <div className="flex items-center gap-2">
                            <SmallButton variant="primary" disabled={isBusy} onClick={() => handleCheckIn(entry)}>
                              報到開桌
                            </SmallButton>
                            <SmallButton variant="ghost" disabled={isBusy} onClick={() => void handleRecall(entry.id)}>
                              {isBusy ? '處理中…' : '再叫一次'}
                            </SmallButton>
                          </div>
                        )}
                        {entry.status === 'WAITING' && (
                          <div className="flex items-center gap-2">
                            <SmallButton variant="secondary" disabled={isBusy} onClick={() => void handleCall(entry.id)}>
                              {isBusy ? '處理中…' : '叫號'}
                            </SmallButton>
                            <SmallButton variant="ghost" disabled={isBusy} onClick={() => void handleAbandon(entry.id)}>
                              放棄
                            </SmallButton>
                          </div>
                        )}
                        {isCalled && !callValid && <span className="type-caption text-ink-400">不可操作</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="type-caption text-ink-600">
            按「報到開桌」會跳出選桌對話框（S-10b），只列坐得下的空桌，人數直接帶入，不用再輸入一次。
          </p>
        </div>
      </div>

      {seatingEntry && (
        <WaitlistSeatDialog
          key={seatingEntry.id}
          entry={seatingEntry}
          busy={Boolean(busyEntries[seatingEntry.id])}
          error={actionError}
          onClose={() => setSeatingEntry(null)}
          onConfirm={handleSeat}
        />
      )}
    </div>
  )
}

function toWaitlistRow(entry) {
  return {
    id: entry.id,
    no: entry.ticketNo,
    name: entry.contactName,
    phoneLast4: entry.contactPhone,
    partySize: entry.partySize,
    status: entry.status,
    createdAt: parseWaitlistTimestamp(entry.createdAt),
    calledAt: entry.calledAt ? parseWaitlistTimestamp(entry.calledAt) : null,
    seatedAt: entry.seatedAt ? parseWaitlistTimestamp(entry.seatedAt) : null,
    expiredAt: entry.expiredAt ? parseWaitlistTimestamp(entry.expiredAt) : null,
  }
}

function isCallStillValid(entry, now) {
  return Boolean(entry.calledAt && now.getTime() < entry.calledAt.getTime() + CALL_EXPIRE_MINUTES * 60_000)
}

function formatDashboardDate(date) {
  const parts = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `今天 ${values.month}/${values.day}（${values.weekday.replace(/^週/, '')}）`
}

function formatTaipeiTime(value) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value instanceof Date ? value : new Date(value))
}

function Stat({ value, label, valueClass = 'text-ink-900' }) {
  return (
    <div className="flex flex-none items-baseline gap-2 whitespace-nowrap">
      <span className={`font-serif text-[26px] leading-none font-black tabular-nums ${valueClass}`}>{value}</span>
      <span className="type-caption text-ink-600">{label}</span>
    </div>
  )
}

function Divider() {
  return <span className="h-8 w-px flex-none bg-line" />
}

function StepButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-14 flex-none items-center justify-center rounded-full border-[1.5px] border-brand-600 bg-surface text-2xl text-brand-600 transition-colors hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  )
}

const SMALL_BUTTON_VARIANT = {
  primary: 'bg-brand-600 text-white hover:bg-brand-500',
  secondary: 'bg-surface text-brand-600 ring-[1.5px] ring-inset ring-brand-600 hover:bg-brand-100',
  ghost: 'text-ink-600 hover:text-brand-600',
}

function SmallButton({ variant = 'ghost', children, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 flex-none items-center rounded-btn px-3.5 text-sm font-medium whitespace-nowrap transition-colors active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${SMALL_BUTTON_VARIANT[variant]}`}
      {...props}
    >
      {children}
    </button>
  )
}

function SyncIndicator({ isLive }) {
  return (
    <span className={`type-caption ${isLive ? 'text-success' : 'text-hold-ink'}`}>
      {isLive ? '即時同步中' : '連線中斷，重新連線中'}
    </span>
  )
}

export default WaitlistManagement
