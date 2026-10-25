import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import {
  useCancelReservationByStaff,
  useOpenOptions,
  useSeatReservation,
} from '@/hooks/reservation/useAdminReservations'
import { fetchTables, openTable } from '@/services/api/table/tableApi'
import { queryScope } from '@/services/client/queryClient'
import SOButton from '@/components/SOButton'
import { SvgIconMap } from '@/assets/SvgIconMap'
import ServiceBellCounter from './ServiceBellCounter'
import ReservationTab from './ReservationTab'
import { seatWaitlist } from '@/services/api/waitlist/waitlistApi'

// 開桌頁自己的頂列。
// 不改共用的 TopBar.tsx；但這頁網址有桌號，TopBar 用網址查不到標題，
// 所以這頁自己做，class 照抄 TopBar，外觀才會跟其他頁一致。
function formatOpenHeaderTime(date) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function OpenPageHeader({ tableNo, tableInfo, isHeld }) {
  const [clockTime, setClockTime] = useState(() => formatOpenHeaderTime(new Date()))

  useEffect(() => {
    const updateClock = () => setClockTime(formatOpenHeaderTime(new Date()))
    updateClock()
    const timer = window.setInterval(updateClock, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <header className="flex min-h-15 w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 md:flex-nowrap md:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-2 md:gap-4">
        <Link to="/admin/table_overview" aria-label="回桌況總覽">
          <SvgIconMap.DashboardBack />
        </Link>
        <span className="type-h2 text-ink-900">{tableNo} 桌 開桌</span>
        <div className="flex items-center rounded-pill border border-line bg-surface-2 px-2 py-1">
          <span className="type-dashboard-top-bar-tag text-ink-600">
            {tableInfo
              ? `${tableInfo.capacity} 人桌・${tableInfo.area}`
              : '正在讀取桌位資料'}
          </span>
        </div>
        {isHeld && (
          <span className="flex items-center gap-1 rounded-pill bg-warning-bg px-2 py-1 type-dashboard-top-bar-tag text-hold-ink">
            <SvgIconMap.ReservationLock aria-hidden="true" className="svg-icon size-4" />
            預約保留
          </span>
        )}
      </div>

      <div className="ml-auto flex flex-row items-center gap-2">
        <span className="type-caption text-ink-600">今天 {clockTime}</span>
        <ServiceBellCounter />
      </div>
    </header>
  )
}

// 開桌人數的步進器：數字存在外層，這裡只負責顯示和通知
function PeopleStepper({ label, value, min, max, onChange, hint, disabled = false }) {
  const circleClass =
    'flex size-14 items-center justify-center rounded-full text-2xl text-brand-600 shadow-[inset_0_0_0_1.5px_var(--color-brand-600)] enabled:hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="flex flex-1 flex-col gap-3">
      <h3 className="type-h3 text-ink-900">{label}</h3>

      <div className="flex items-center gap-6">
        <button
          type="button"
          aria-label={`${label}減一`}
          onClick={() => onChange(value - 1)}
          disabled={disabled || value <= min}
          className={circleClass}
        >
          −
        </button>
        <span className="w-10 text-center type-h1 text-ink-900 tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`${label}加一`}
          onClick={() => onChange(value + 1)}
          disabled={disabled || value >= max}
          className={circleClass}
        >
          ＋
        </button>
      </div>

      <p className="type-caption text-ink-600">{hint}</p>
    </div>
  )
}

// S-02b 現場頁籤：輸入大人小孩人數後開桌
function WalkinTab({ tableNo, capacity, openLabel, disabled, onOpen }) {
  const navigate = useNavigate()
  const [adults, setAdults] = useState(1)
  const [kids, setKids] = useState(0)

  const total = adults + kids
  const seatsEnough = total >= 1 && total <= capacity

  function handleOpen() {
    if (!seatsEnough || disabled) return
    onOpen({ type: 'walkin', adults, kids })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="type-h1 text-ink-900">這桌坐幾位？</h2>
        <p className="mt-2 type-body-sm text-ink-600">
          請依實際入座人數填寫，以便安排座位；餐點總額依點餐內容計算。
        </p>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <PeopleStepper
          label="大人"
          value={adults}
          min={0}
          max={capacity - kids}
          onChange={setAdults}
          hint={`最多 ${capacity} 位`}
          disabled={disabled}
        />
        <div className="hidden w-px self-stretch bg-line sm:block" />
        <PeopleStepper
          label="小孩"
          value={kids}
          min={0}
          max={capacity - adults}
          onChange={setKids}
          hint="請依實際入座兒童人數填寫"
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between rounded-card bg-brand-100 px-6 py-4">
        <span className="type-h2 text-ink-900">共 {total} 位</span>
        <span className="type-body-sm text-ink-600">
          {seatsEnough
            ? `${tableNo} 是 ${capacity} 人桌，座位夠`
            : total === 0
              ? '至少要有 1 位客人'
              : `超過 ${capacity} 人桌的座位`}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SOButton
            text={openLabel}
            height="h-11"
            onClick={handleOpen}
            disabled={disabled || !seatsEnough}
          />
        </div>
        <div className="w-28">
          <SOButton
            text="取消"
            variant="ghost"
            height="h-11"
            onClick={() => navigate('/admin/table_overview')}
          />
        </div>
      </div>
    </div>
  )
}

// S-02c 候位頁籤：列出已叫號的組別，人數直接帶入
function WaitlistTab({ list, openLabel, disabled, onOpen }) {
  function handleOpen(group) {
    onOpen({ type: 'waitlist', waitlistId: group.id, people: group.people })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="type-h2 text-ink-900">已叫號、等著入座</h2>
        <span className="type-caption text-ink-600">人數用登記時填的，不用重填</span>
      </div>

      {list.length === 0 ? (
        <p className="py-10 text-center type-body-sm text-ink-600">目前沒有已叫號的候位</p>
      ) : (
        list.map((group) => (
          <div
            key={group.id}
            className="flex flex-wrap items-center gap-3 rounded-card border border-line px-4 py-4 sm:gap-6 sm:px-5"
          >
            <span className="w-14 type-h2 text-ink-900 tabular-nums">{group.queueNo}</span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <b className="type-body text-ink-900">{group.name}</b>
                <span className="rounded-pill bg-warning-bg px-2.5 py-0.5 type-caption text-hold-ink shadow-[inset_0_0_0_1px_var(--color-warning-line)]">
                  已叫號
                </span>
              </div>
              <p className="type-caption text-ink-600 tabular-nums">
                {group.people} 位・已等 {group.waitMinutes} 分鐘
              </p>
            </div>

            <div className="ml-auto w-32">
              <SOButton
                text={openLabel}
                height="h-9"
                onClick={() => handleOpen(group)}
                disabled={disabled}
              />
            </div>
          </div>
        ))
      )}

      <div className="rounded-card bg-surface-2 px-5 py-4 type-caption text-ink-600">
        ⓘ 確認開桌之後，這一組的候位狀態會轉成 <b>已報到</b>，從這份清單消失。
        <br />
        沒轉狀態的話，同一組會一直出現在下一張桌的清單上。
      </div>
    </div>
  )
}

// 頂部提示條：danger = 紅色訂位衝突，hold = 黃色預約保留
function AlertBar({ tone, title, children }) {
  const toneClass =
    tone === 'danger'
      ? 'bg-brand-100 shadow-[inset_0_0_0_1.5px_var(--color-danger)]'
      : 'bg-warning-bg shadow-[inset_0_0_0_1.5px_var(--color-warning-line)]'

  return (
    <div className={`mb-4 flex gap-3 rounded-card px-5 py-4 ${toneClass}`}>
      <span className={tone === 'danger' ? 'text-danger' : 'text-hold-ink'}>
        {tone === 'danger' ? (
          '⚠'
        ) : (
          <SvgIconMap.ReservationLock aria-hidden="true" className="svg-icon size-5" />
        )}
      </span>
      <div>
        <p className="type-body-sm font-bold text-ink-900">{title}</p>
        <p className="mt-1 type-caption text-ink-600">{children}</p>
      </div>
    </div>
  )
}

// 有訂位衝突時，按「仍要開桌」後的再確認
function ConfirmDialog({ tableNo, onConfirm, onChangeTable }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-96 rounded-card bg-surface p-6 shadow-pop">
        <h2 className="type-h2 text-ink-900">確定要開 {tableNo}？</h2>
        <p className="mt-2 type-body-sm text-ink-600">
          這張桌稍後有訂位，客人可能還沒吃完訂位就到了。
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <SOButton text="確定開桌" height="h-11" onClick={onConfirm} />
          <SOButton text="換一張桌" variant="secondary" height="h-11" onClick={onChangeTable} />
        </div>
      </div>
    </div>
  )
}

function TableOpen() {
  const { tableNo } = useParams()
  const navigate = useNavigate()

  // Counter 可讀桌況總覽；桌位設定端點限 Manager，不能用它解桌號。
  const tablesQuery = useQuery({
    queryKey: [...queryScope.employee, 'tables'],
    queryFn: ({ signal }) => fetchTables(signal),
  })
  const table = tablesQuery.data?.find((item) => item.tableNo === tableNo)
  const tableId = table?.tableId
  const optionsQuery = useOpenOptions(tableId)
  const options = optionsQuery.data
  const seatReservation = useSeatReservation()
  const cancelByStaff = useCancelReservationByStaff()
  const [noticeState, setNoticeState] = useState(null)
  const notice = noticeState?.tableNo === tableNo ? noticeState.message : null
  const setNotice = (message) => setNoticeState(message == null ? null : { tableNo, message })
  const [openingAttempt, setOpeningAttempt] = useState(null)
  const [cancelAttempt, setCancelAttempt] = useState(null)
  const [pickedTabState, setPickedTabState] = useState(null)
  const [pendingOpenState, setPendingOpenState] = useState(null)
  const mountedRef = useRef(false)
  const activeTableNoRef = useRef(tableNo)
  const requestGenerationRef = useRef(0)

  const isOpening =
    openingAttempt?.tableNo === tableNo && openingAttempt.generation === requestGenerationRef.current
  const isCancelling =
    cancelAttempt?.tableNo === tableNo && cancelAttempt.generation === requestGenerationRef.current

  // overview 只提供真實桌位資訊；walk-in / 候位操作還要等 open-options 成功。
  const tableInfo = options
    ? { capacity: options.seats, area: options.area }
    : table
      ? { capacity: table.seats, area: table.area }
      : null
  const optionsReady = Boolean(
    table &&
      tablesQuery.isSuccess &&
      !tablesQuery.isError &&
      options &&
      optionsQuery.isSuccess &&
      !optionsQuery.isError,
  )
  const canOpenTable = optionsReady && options.status === 'AVAILABLE'
  // 115 分鐘內的訂位（沒有就是 null）
  const upcoming = options?.upcomingOnThisTable
  const conflict = upcoming
    ? { time: toTime(upcoming.startTime), name: upcoming.name, people: upcoming.partySize }
    : null
  const reservedHoldId = options?.heldFor?.reservationId ?? null

  // 坐不坐得下、用餐時間在現在 −10 ～ +30 分的篩選都在後端做了，這裡不再 filter
  const visibleReservations = (options?.reservations ?? []).map(toReservationRow)
  const reservationCount = visibleReservations.length
  const openLabel = conflict ? '仍要開桌' : '開桌'
  const isHeld = Boolean(options?.heldFor)
  // 候位資料由 open-options 按這桌 seats 篩過；不再讀全店候位清單。
  const calledWaitlist = (options?.waitlist ?? [])
    .filter((group) => group.status === 'CALLED')
    .map(toWaitlistGroup)
  const defaultTab =
    isHeld || reservationCount > 0
      ? 'reservation'
      : calledWaitlist.length > 0
        ? 'waitlist'
        : 'walkin'
  // 資料回來前不知道預設頁籤，沒手動切過就一直跟著資料決定。
  // 不用 effect 等資料回來再 setState，pickedTab 有值（手動切過）就以它為準，沒有就用算出來的
  const pickedTab = pickedTabState?.tableNo === tableNo ? pickedTabState.tab : null
  const setPickedTab = (tab) =>
    setPickedTabState(tab == null ? null : { tableNo, tab })
  const activeTab = pickedTab ?? defaultTab
  const setActiveTab = setPickedTab
  const pendingOpen = pendingOpenState?.tableNo === tableNo ? pendingOpenState.payload : null
  const setPendingOpen = (payload) =>
    setPendingOpenState(payload == null ? null : { tableNo, payload })

  useLayoutEffect(() => {
    mountedRef.current = true
    activeTableNoRef.current = tableNo
    requestGenerationRef.current += 1
    return () => {
      mountedRef.current = false
      requestGenerationRef.current += 1
    }
  }, [tableNo])

  useEffect(() => {
    setPickedTab(null)
    setPendingOpen(null)
    setNotice(null)
    setOpeningAttempt(null)
    setCancelAttempt(null)
  }, [tableNo])

  const tabs = [
    { key: 'walkin', label: '現場' },
    { key: 'waitlist', label: '候位', count: calledWaitlist.length },
    { key: 'reservation', label: '預約', count: reservationCount },
  ]

  function beginAttempt() {
    const attempt = {
      tableNo,
      generation: ++requestGenerationRef.current,
    }
    return {
      ...attempt,
      isCurrent: () =>
        mountedRef.current &&
        activeTableNoRef.current === attempt.tableNo &&
        requestGenerationRef.current === attempt.generation,
    }
  }

  function clearAttempt(setAttempt, attempt) {
    if (!mountedRef.current) return
    setAttempt((current) =>
      current?.tableNo === attempt.tableNo && current?.generation === attempt.generation
        ? null
        : current,
    )
  }

  function retryLoad() {
    setNotice(null)
    if (tablesQuery.isError || !table) {
      void tablesQuery.refetch()
    } else {
      void optionsQuery.refetch()
    }
  }

  // 有訂位衝突就先跳確認框，沒有就直接開桌
  function requestOpen(payload) {
    if (isOpening || isCancelling) return
    if (!optionsReady || !canOpenTable) {
      setNotice('桌況或開桌資料已更新，請重試後再操作。')
      return
    }

    const isReservedGuest = payload.type === 'reservation' && payload.reservationId === reservedHoldId
    if (isHeld && !isReservedGuest) {
      setNotice('這張桌目前保留給訂位客人，只能為該筆訂位報到。')
      return
    }
    if (payload.type === 'walkin' && (payload.adults < 0 || payload.kids < 0 || payload.adults + payload.kids < 1 || payload.adults + payload.kids > options.seats)) {
      setNotice(`開桌人數需為 1 至 ${options.seats} 位。`)
      return
    }
    if (payload.type === 'waitlist' && (payload.people < 1 || payload.people > options.seats)) {
      setNotice(`這組候位人數超過 ${options.seats} 人桌容量，請重新整理候位資料。`)
      return
    }

    setNotice(null)
    if (conflict && !isReservedGuest) {
      setPendingOpen(payload)
    } else {
      void confirmOpen(payload)
    }
  }

  async function confirmOpen(payload) {
    if (!optionsReady || !canOpenTable || tableId === undefined) {
      setPendingOpen(null)
      setNotice('桌況或開桌資料已更新，請重試後再操作。')
      return
    }

    const isReservedGuest = payload.type === 'reservation' && payload.reservationId === reservedHoldId
    if (isHeld && !isReservedGuest) {
      setPendingOpen(null)
      setNotice('這張桌目前保留給訂位客人，只能為該筆訂位報到。')
      return
    }
    if (payload.type === 'walkin' && (payload.adults < 0 || payload.kids < 0 || payload.adults + payload.kids < 1 || payload.adults + payload.kids > options.seats)) {
      setPendingOpen(null)
      setNotice(`開桌人數需為 1 至 ${options.seats} 位。`)
      return
    }
    if (payload.type === 'waitlist' && (payload.people < 1 || payload.people > options.seats)) {
      setPendingOpen(null)
      setNotice(`這組候位人數超過 ${options.seats} 人桌容量，請重新整理候位資料。`)
      return
    }

    if (isOpening || isCancelling) return

    setPendingOpen(null)
    setNotice(null)
    const attempt = beginAttempt()
    setOpeningAttempt(attempt)
    if (payload.type === 'reservation') {
      try {
        await seatReservation.mutateAsync({ id: payload.reservationId, tableId })
        if (attempt.isCurrent()) navigate('/admin/table_overview')
      } catch (error) {
        // 搶桌、撞到保留、訂位剛被取消或已逾時：留在本頁，清單會重抓
        if (attempt.isCurrent()) setNotice(error?.message ?? '訂位報到失敗，請重試。')
      } finally {
        clearAttempt(setOpeningAttempt, attempt)
      }
      return
    }

    try {
      if (payload.type === 'waitlist') {
        await seatWaitlist(payload.waitlistId, tableId)
      } else {
        await openTable(tableId, payload.adults, payload.kids)
      }
      if (attempt.isCurrent()) navigate('/admin/table_overview')
    } catch (error) {
      if (attempt.isCurrent()) {
        setNotice(`${payload.type === 'waitlist' ? '候位開桌' : '開桌'}失敗：${error?.message ?? '請重試。'}`)
      }
    } finally {
      clearAttempt(setOpeningAttempt, attempt)
    }
  }

  function cancelReservation(id) {
    if (isOpening || isCancelling) return
    // 不用自己從清單移掉：成功後 hook 會重抓開桌選項，那筆就消失，這張桌的保留也跟著解開
    setNotice(null)
    const attempt = beginAttempt()
    setCancelAttempt(attempt)
    cancelByStaff.mutate(
      { id },
      {
        onError: (error) => {
          if (attempt.isCurrent()) setNotice(error?.message ?? '取消訂位失敗，請重試。')
        },
        onSettled: () => clearAttempt(setCancelAttempt, attempt),
      },
    )
  }

  return (
    <>
      <OpenPageHeader tableNo={tableNo} tableInfo={tableInfo} isHeld={isHeld} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto w-full max-w-205 p-4 sm:p-6">
          {notice && <p className="mb-4 type-body-sm text-danger">{notice}</p>}
          {tablesQuery.isPending && !table && (
            <p role="status" className="py-10 text-center type-body-sm text-ink-600">正在讀取桌位資料…</p>
          )}
          {tablesQuery.isError && (
            <LoadError message={tablesQuery.error.message} onRetry={retryLoad} />
          )}
          {tablesQuery.isSuccess && !table && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="type-body-sm text-danger">找不到 {tableNo} 桌的資料，請返回桌況總覽重新選擇。</p>
              <SOButton text="回桌況總覽" variant="secondary" height="h-11" onClick={() => navigate('/admin/table_overview')} />
            </div>
          )}
          {table && optionsQuery.isPending && !options && (
            <p role="status" className="py-10 text-center type-body-sm text-ink-600">正在確認桌況與開桌選項…</p>
          )}
          {table && optionsQuery.isError && (
            <LoadError message={optionsQuery.error.message} onRetry={retryLoad} />
          )}
          {optionsReady && (
            <>
              {isHeld ? (
                <AlertBar
                  tone="hold"
                  title={`${tableNo} 預約保留中（${toTime(options.heldFor.startTime)} ${options.heldFor.name} ${options.heldFor.partySize} 位）`}
                >
                  這張桌保留給 {options.heldFor.name} {toTime(options.heldFor.startTime)}（{options.heldFor.partySize} 位）。客人來電取消的話，直接按下面的「取消訂位」。
                  <br />
                  {options.heldFor.name} 到了，直接在下面按「報到開桌」。
                </AlertBar>
              ) : (
                conflict && (
                  <AlertBar
                    tone="danger"
                    title={`${tableNo} 在 ${conflict.time} 有訂位（${conflict.name} ${conflict.people} 位），現在開桌，客人可能還沒吃完訂位就到了。`}
                  >
                    只提醒、不擋。按「仍要開桌」會再確認一次；想把桌留給那組，就換一張桌。
                  </AlertBar>
                )
              )}

              {!canOpenTable && (
                <AlertBar tone="danger" title={`${tableNo} 桌目前不是空桌`}>
                  目前狀態：{options.status}。請返回桌況總覽確認最新狀態。
                </AlertBar>
              )}

              <div role="tablist" aria-label={`${tableNo} 桌開桌方式`} className="flex gap-6 overflow-x-auto rounded-t-card border-b border-line bg-surface px-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    id={`table-open-tab-${tab.key}`}
                    aria-controls="table-open-panel"
                    aria-selected={activeTab === tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`-mb-px border-b-2 py-3 type-body ${
                      activeTab === tab.key
                        ? 'border-brand-600 font-bold text-brand-600'
                        : 'border-transparent text-ink-600 hover:text-ink-900'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && ` ${tab.count}`}
                  </button>
                ))}
              </div>

              <section
                id="table-open-panel"
                role="tabpanel"
                aria-labelledby={`table-open-tab-${activeTab}`}
                className="min-w-0 overflow-x-auto rounded-b-card border border-t-0 border-line bg-surface p-4 sm:p-6"
              >
                {activeTab === 'walkin' && (
                  <WalkinTab
                    tableNo={tableNo}
                    capacity={options.seats}
                    openLabel={openLabel}
                    disabled={!canOpenTable || isHeld || isOpening}
                    onOpen={requestOpen}
                  />
                )}
                {activeTab === 'waitlist' && (
                  <WaitlistTab
                    list={calledWaitlist}
                    openLabel={openLabel}
                    disabled={!canOpenTable || isHeld || isOpening}
                    onOpen={requestOpen}
                  />
                )}
                {activeTab === 'reservation' && (
                  <ReservationTab
                    list={visibleReservations}
                    tableNo={tableNo}
                    seats={options.seats}
                    holdId={reservedHoldId}
                    openLabel={openLabel}
                    busy={!canOpenTable || isOpening || isCancelling}
                    onOpen={requestOpen}
                    onCancel={cancelReservation}
                  />
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {pendingOpen && (
        <ConfirmDialog
          tableNo={tableNo}
          onConfirm={() => void confirmOpen(pendingOpen)}
          onChangeTable={() => navigate('/admin/table_overview')}
        />
      )}
    </>
  )
}

export default TableOpen

function LoadError({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p role="alert" className="type-body-sm text-danger">資料讀取失敗：{message}</p>
      <SOButton text="重試" height="h-11" onClick={onRetry} />
    </div>
  )
}

// open-options 回傳的候位資料已按本桌 capacity 過濾。
function toWaitlistGroup(w) {
  return {
    id: w.id,
    queueNo: w.no,
    name: w.name,
    people: w.partySize,
    waitMinutes: w.waitedMinutes,
  }
}

// 開桌頁預約頁籤要的欄位；電話後端已經遮好了
function toReservationRow(item) {
  return {
    id: item.id,
    time: toTime(item.startTime),
    name: item.name,
    phone: item.phoneMasked,
    people: item.partySize,
    preorderCount: item.preorderItemCount,
    assignedTable: item.assignedTableNo ?? '—',
  }
}

// "2026-10-15T18:30:00+08:00" → "18:30"（後端回的就是店家時區）
function toTime(isoTime) {
  return isoTime.slice(11, 16)
}
