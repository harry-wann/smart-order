import { useNavigate } from 'react-router'
import { useEffect, useState } from 'react'
import { useAdminReservations } from '@/hooks/reservation/useAdminReservations'
import SOButton from '@/components/SOButton'
import TopBar from '@/components/dashboard/TopBar'
import { SvgIconMap } from '@/assets/SvgIconMap'
import { fetchTables, cleanTable } from '@/services/api/table/tableApi'
import { fetchWaitlist } from '@/services/api/waitlist/waitlistApi'
import { useTableStatusSocket } from '@/services/realtime/useTableStatusSocket'
import ServiceBellCounter from './ServiceBellCounter'

// 把後臺狀態的英文轉成中文顯示、根據桌位狀態決定顏色、根據狀態決定標籤底色
const statusStyles = {
  available: {
    name: '空桌',
    cardClass: 'bg-table-available text-ink-900',
    labelClass: 'bg-white/70',
  },
  occupied: {
    name: '用餐中',
    cardClass: 'bg-table-occupied text-white',
    labelClass: 'bg-white/90',
  },
  cleaning: {
    name: '待清理',
    cardClass: 'bg-table-cleaning text-white',
    labelClass: 'bg-white/90',
  },
  reserved: {
    name: '預約保留',
    cardClass: 'bg-accent-100 text-ink-900 shadow-[inset_0_0_0_1.5px_var(--color-accent-500)]',
    labelClass: 'bg-accent-500',
  },
}

//上方條狀> 桌狀的統整
function StatItem({ count, label, swatchClass, countClass = 'text-ink-900' }) {
  return (
    <div className="flex items-baseline gap-2 whitespace-nowrap">
      <span className={`type-h1 font-black tabular-nums ${countClass}`}>{count}</span>
      <span className="type-caption text-ink-600">
        {swatchClass && <i className={`mr-1 inline-block size-2.5 rounded-[3px] ${swatchClass}`} />}
        {label}
      </span>
    </div>
  )
}

//正中間 > 12格桌卡
//用餐中(isOvertime)而且時間超過100minutes、加上紅色外框
function TableCard({ table, onCleanClick }) {
  const style = statusStyles[table.status]
  const isOvertime = table.status === 'occupied' && table.minutes > 100
  const navigate = useNavigate()

  function handleClick() {
    if (table.status === 'available' || table.status === 'reserved') {
      navigate(`/admin/table_overview/${table.id}/open`)
    } else if (table.status === 'occupied') {
      navigate(`/admin/table/${table.id}`)
    } else if (table.status === 'cleaning') {
      onCleanClick(table)
    }
  }

  return (
    <button
      type="button"
      aria-label={`${table.id} 桌，${style.name}${table.status === 'occupied' ? `，用餐 ${table.minutes} 分鐘${isOvertime ? '，超過 100 分鐘' : ''}` : ''}`}
      onClick={handleClick}
      className={`flex min-h-26.5 w-full flex-col gap-1 rounded-card px-4 py-3 text-left ${style.cardClass} cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
        isOvertime ? 'shadow-[inset_0_0_0_3px_var(--color-danger)]' : ''
      }`}
    >
      <span
        className={`mb-1 self-start rounded-pill px-2.5 py-0.5 type-caption text-ink-900 ${style.labelClass}`}
      >
        {style.name}
      </span>

      <span className="type-h2 tabular-nums">{table.id}</span>

      {table.status === 'occupied' && (
        <>
          <span className="type-caption tabular-nums">
            {table.adults} 大 {table.kids} 小・{table.minutes} 分
          </span>
          {table.amount != null && (
            <span className="type-caption font-bold tabular-nums">NT$ {table.amount.toLocaleString()}</span>
          )}
        </>
      )}

      {table.status === 'cleaning' && table.paidAt && (
        <span className="type-caption tabular-nums">{table.paidAt} 結清</span>
      )}

      {table.status === 'reserved' && table.heldFor && (
        <span className="type-caption">
          {formatTaipeiTime(table.heldFor.startTime)}・{table.heldFor.name} {table.heldFor.partySize} 位
        </span>
      )}
    </button>
  )
}

function CleanConfirmDialog({ table, onConfirm, onCancel }) {
  return (
    // 半透明背景：點背景 = 取消
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40"
    >
      {/* stopPropagation：點白色框裡面時，不要讓點擊傳到背景而被關掉 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-110 rounded-card bg-surface px-8 py-7 text-center shadow-pop"
      >
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent-100">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent-100">
  <SvgIconMap.TableOverviewPot className="size-7" />
</div>
        </div>
        <h2 className="type-h2 text-ink-900">{table.id} 清潔完成了嗎？</h2>
        <p className="mt-2 type-caption text-ink-600">
          確定後這張桌會變回<b className="text-ink-900">空桌</b>，可以帶客人入座。
        </p>
                <div className="mt-6 flex flex-col gap-2">
          <SOButton text="清潔完成" height="h-11" onClick={onConfirm} />
          <SOButton text="還沒" variant="ghost" height="h-11" onClick={onCancel} />
        </div>
      </div>
    </div>
  )
}

// 候位區的單組候位
function WaitingChip({ waiting }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-pill px-3 py-2 ${
        waiting.called ? 'bg-warning-bg' : 'bg-surface-2'
      }`}
    >
      <b className="text-ink-900 tabular-nums">{waiting.id}</b>
      <span className="type-body-sm text-ink-900">
        {waiting.name}・{waiting.people} 位
      </span>

      {waiting.called ? (
        <span className="rounded-pill bg-warning-bg px-2.5 py-0.5 type-caption text-hold-ink shadow-[inset_0_0_0_1px_var(--color-warning-line)]">
          已叫號
        </span>
      ) : (
        <span className="type-caption text-ink-600 tabular-nums">{waiting.waitMinutes} 分</span>
      )}
    </div>
  )
}

function LoadingSkeleton({ count }) {
  return (
    <div className="flex items-start gap-6 p-6">
      <main className="flex min-w-0 flex-1 flex-col gap-4">
        {/* 統計列的骨架 */}
        <div className="rounded-card border border-line bg-surface px-5 py-4">
          <div className="h-8 animate-pulse rounded-btn bg-surface-2" />
        </div>

        {/* 桌卡的骨架：格子數 = 桌數 */}
        <div className="grid grid-cols-4 gap-card-gap">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="min-h-26.5 animate-pulse rounded-card bg-surface-2" />
          ))}
        </div>
      </main>
      <aside className="w-75 shrink-0" />
    </div>
  )
}

// 空資料：還沒建立座位（不是錯誤，所以不用紅字）開班時會看到的畫面
function EmptyState() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-32 text-center">
      <SvgIconMap.TableOverviewEmpty className="mb-2 size-23" />

      <h2 className="type-h3 text-ink-900">還沒有建立座位</h2>
      <p className="type-body-sm text-ink-600">
        先到「座位管理」把桌號、座位數、區域建起來，
        <br />
        這裡才會出現桌況色塊，桌上的 QR code 也才印得出來。
      </p>

            <div className="mt-2 w-40">
        <SOButton text="去座位管理" height="h-11" onClick={() => navigate('/admin/seats')} />
      </div>
    </div>
  )
}

// 快取提示條：錯誤畫面、改用離線快取後都會出現
function CacheBanner({ cachedAt }) {
  return (
    <div className="mx-6 mt-4 rounded-card bg-warning-bg px-4 py-2.5 type-caption text-hold-ink">
      <b>目前顯示的是 {cachedAt} 的快取資料</b>
      ，可能不是最新的。連線恢復後會自動重新抓一次完整桌況。
    </div>
  )
}

// 錯誤：讀不到桌況。主文案用中文講下一步，技術原因放小字
function ErrorState({ onRetry, onUseCache }) {
  return (
    <div className="flex flex-col items-center gap-3 py-28 text-center">
      {/* 警告 icon：從 Figma 匯出的 svg（80×80，含圓底） */}
      <SvgIconMap.TableOverviewError className="mb-2 size-20" />

      <h2 className="type-h3 text-ink-900">桌況讀不到</h2>
      <p className="type-body-sm text-ink-600">
        後端沒有回應。先確認店內網路，再按重試。
        <br />
        如果一直失敗，請通知負責的同學看伺服器。
      </p>

      <div className="mt-2 flex gap-3">
                <div className="w-32">
          <SOButton text="重試" height="h-11" onClick={onRetry} />
        </div>
        <div className="w-40">
          <SOButton text="改用離線快取" variant="secondary" height="h-11" onClick={onUseCache} />
        </div>
      </div>
    </div>
  )
}

// 右上角連線狀態：WebSocket 連著就是綠色「即時同步中」，斷線就是黃色「連線中斷，重新連線中」
function SyncIndicator({ isLive }) {
  if (!isLive) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-btn border border-line bg-warning-bg px-3 type-caption text-hold-ink">
        <span className="size-2 rounded-full bg-hold-ink" />
        連線中斷，重新連線中
      </div>
    )
  }
  return (
    <div className="flex h-9 items-center gap-2 rounded-btn border border-line bg-success-bg px-3 type-caption text-success">
      <span className="size-2 rounded-full bg-success" />
      即時同步中
    </div>
  )
}



//------------------------------主元件TableOverview()-------------------------------//
function TableOverview() {
  const navigate = useNavigate()
  const [tableData, setTableData] = useState([])
  const [cleaningTable, setCleaningTable] = useState(null)
  const [now, setNow] = useState(() => new Date())
  const tableList = tableData.map((table) => toTableCard(table, now))
  const availableCount = tableList.filter((table) => table.status === 'available').length
  const occupiedCount = tableList.filter((table) => table.status === 'occupied').length
  const cleaningCount = tableList.filter((table) => table.status === 'cleaning').length
  const reservedCount = tableList.filter((table) => table.status === 'reserved').length

  const [viewState, setViewState] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)
  // 別台櫃檯開桌、清潔完成時，後端推 TABLE_STATUS → 重抓桌況和候位
  const isLive = useTableStatusSocket(() => setReloadKey((k) => k + 1))

  // 保留窗只會隨時間開始或結束，沒有桌況事件；每分鐘重抓並讓用餐時間即時前進。
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date())
      setReloadKey((key) => key + 1)
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const todayReservationsQuery = useAdminReservations(toLocalDate(now))
  const pendingCheckInCount = todayReservationsQuery.data
    ?.filter((reservation) => reservation.status === 'CONFIRMED').length

  // 畫面出現時（以及按「重試」時）去後端拿桌況
  useEffect(() => {
    const controller = new AbortController()

    fetchTables(controller.signal)
      .then((data) => {
        setTableData(data)
        setViewState('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setViewState('error')
      })

    return () => controller.abort()
  }, [reloadKey])

  // 底部「候位中」：等待中＋已叫號的組別；按重試、清潔完成時跟桌況一起重抓
  const [waitinglist, setWaitinglist] = useState([])
  useEffect(() => {
    const controller = new AbortController()
    fetchWaitlist(controller.signal)
      .then((data) => setWaitinglist(data.map(toWaitingChip)))
      .catch(() => {}) // 候位抓不到不影響桌況，底部就先空著
    return () => controller.abort()
  }, [reloadKey])

  // 目前還在等的組別，平均已經等了幾分鐘
  const avgWait = waitinglist.length
    ? Math.round(waitinglist.reduce((sum, w) => sum + w.waitMinutes, 0) / waitinglist.length)
    : 0

  // 顯示空資料的兩種情況：
  // 1. 網址 ?state=empty（demo 用）
  // 2. 狀態正常，但真的一張桌子都沒有（之後接後端就靠這個）
  const showEmpty = viewState === 'empty' || (viewState === 'ready' && tableList.length === 0)

  async function handleConfirmClean() {
    try {
      await cleanTable(cleaningTable.tableId)
      setCleaningTable(null)
      setReloadKey((k) => k + 1)
    } catch (err) {
      alert(`清潔失敗：${err.message}`)
    }
  }

  function handleRetry() {
    setViewState('loading')
    setReloadKey((k) => k + 1)
  }

  function handleUseCache() {
    // 顯示手上已有的舊資料，並加上黃色提示條
    setViewState('cached')
  }

  return (
      <>
      <TopBar
        tag={formatDashboardDate(now)}
        childrenRight={
          <>
            <SyncIndicator isLive={isLive} />
            <ServiceBellCounter />
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
  

      {/* 載入中 */}
      {viewState === 'loading' && <LoadingSkeleton count={tableList.length || 12} />}

      {/* 空資料 */}
      {showEmpty && <EmptyState />}

      {/* 快取提示條：錯誤、離線快取都顯示 */}
      {(viewState === 'error' || viewState === 'cached') && <CacheBanner cachedAt="18:34" />}

      {/* 錯誤 */}
      {viewState === 'error' && <ErrorState onRetry={handleRetry} onUseCache={handleUseCache} />}

      {/* 正常畫面（cached 也是正常畫面，只是上面多了黃條） */}
      {(viewState === 'ready' || viewState === 'cached') && !showEmpty && (
        <div className="flex flex-col gap-6 p-4 md:flex-row md:p-6">
          <main className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-line bg-surface px-5 py-4">
              <StatItem count={availableCount} label="空桌" swatchClass="bg-table-available" />
              <StatItem
                count={occupiedCount}
                label="用餐中"
                swatchClass="bg-table-occupied"
                countClass="text-brand-600"
              />
              <StatItem count={cleaningCount} label="待清理" swatchClass="bg-table-cleaning" />
              <StatItem
                count={reservedCount}
                label="預約保留"
                swatchClass="bg-accent-100 shadow-[inset_0_0_0_1.5px_var(--color-accent-500)]"
                countClass="text-accent-600"
              />

              <div className="hidden h-8 w-px self-stretch bg-line md:block" />

              <StatItem count={pendingCheckInCount ?? '—'} label="待報到預約" countClass="text-accent-600" />

              <div className="hidden h-8 w-px self-stretch bg-line md:block" />

              <StatItem count={waitinglist.length} label="組候位中" />
            </div>

            <div className="grid grid-cols-2 gap-card-gap md:grid-cols-3 xl:grid-cols-4">
              {tableList.map((table) => (
                <TableCard key={table.id} table={table} onCleanClick={setCleaningTable} />
              ))}
            </div>

            <section className="rounded-card border border-line bg-surface p-4">
              <div className="flex items-center gap-2">
                <h2 className="type-h3 text-ink-900">候位中</h2>
                <span className="rounded-pill bg-surface-2 px-2.5 py-0.5 type-caption text-ink-600 shadow-[inset_0_0_0_1px_var(--color-line)]">
                  {waitinglist.length} 組
                </span>
                <span className="type-caption text-ink-600">平均等 {avgWait} 分</span>

                <div className="flex-1" />

                                  <div className="w-36">
                    <SOButton
                      text="去候位管理"
                      variant="secondary"
                      height="h-9"
                      onClick={() => navigate('/admin/waitlist')}
                    />
                  </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-3">
                {waitinglist.map((waiting) => (
                  <WaitingChip key={waiting.id} waiting={waiting} />
                ))}
              </div>
            </section>
          </main>
          <aside className="hidden w-75 shrink-0 lg:block" />

        </div>
      )}
</div>
      {cleaningTable && (
        <CleanConfirmDialog
          table={cleaningTable}
          onConfirm={handleConfirmClean}
          onCancel={() => setCleaningTable(null)}
        />
      )}
    </>
  )
}

// 後端的桌子 → 這個畫面用的格式
function toTableCard(t, now) {
  const openedAt = t.openedAt ? new Date(t.openedAt).getTime() : Number.NaN
  return {
    id: t.tableNo,
    tableId: t.tableId,
    status: (t.displayStatus ?? t.status).toLowerCase(),
    adults: t.adultCount,
    kids: t.childCount,
    minutes: Number.isFinite(openedAt) ? Math.max(0, Math.floor((now.getTime() - openedAt) / 60000)) : null,
    heldFor: t.heldFor,
  }
}

function toLocalDate(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
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
  }).format(new Date(value))
}

// 後端 WaitlistEntry → 底部候位小卡用的欄位
function toWaitingChip(w) {
  return {
    id: w.ticketNo,
    name: w.contactName,
    people: w.partySize,
    called: w.status === 'CALLED',
    waitMinutes: Math.max(0, Math.floor((Date.now() - new Date(w.createdAt)) / 60000)),
  }
}

export default TableOverview
