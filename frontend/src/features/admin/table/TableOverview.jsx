import { useNavigate } from 'react-router'
import { useEffect, useState } from 'react'
import SOButton from '@/components/SOButton'
import TopBar from '@/components/dashboard/TopBar'
import { SvgIconMap } from '@/assets/SvgIconMap'
import BellButtonPlaceholder from './BellButtonPlaceholder'
import { fetchTables } from '@/services/api/tableApi'

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



// 底部候位中的顯示>假資料、之後接後端要改
const waitinglist = [
  { id: 'A13', name: '李', people: 4, called: true },
  { id: 'A12', name: '王', people: 3, waitMinutes: 18 },
  { id: 'A14', name: '張', people: 6, waitMinutes: 4 },
]

//右側畫面的服務鈴>假資料、之後接後端要改
const initialBellCalls = [
  { id: 1, tableId: 'A03', request: '呼叫服務生', minutesAgo: 1 },
  { id: 2, tableId: 'B03', request: '加湯', minutesAgo: 3 },
  { id: 3, tableId: 'C01', request: '換鍋撈渣', minutesAgo: 4 },
]

//---------------------------------------------------//

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
  // 只有空桌、待清理點了有反應，才顯示手指游標
  const isClickable = table.status === 'available' || table.status === 'cleaning'

  const navigate = useNavigate()

  function handleClick() {
    if (table.status === 'available') {
            navigate(`/admin/table_overview/${table.id}/open`)
    } else if (table.status === 'cleaning') {
      onCleanClick(table)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`flex min-h-26.5 flex-col gap-1 rounded-card px-4 py-3 ${style.cardClass} ${
        isClickable ? 'cursor-pointer' : ''
      } ${isOvertime ? 'shadow-[inset_0_0_0_3px_var(--color-danger)]' : ''}`}
    >
      <span
        className={`mb-1 self-start rounded-pill px-2.5 py-0.5 type-caption text-ink-900 ${style.labelClass}`}
      >
        {style.name}
      </span>

      <h3 className="type-h2 tabular-nums">{table.id}</h3>

      {table.status === 'occupied' && (
        <>
          <p className="type-caption tabular-nums">
            {table.adults} 大 {table.kids} 小・{table.minutes} 分
          </p>
          {table.amount != null && (
            <p className="type-caption font-bold tabular-nums">NT$ {table.amount.toLocaleString()}</p>
          )}
        </>
      )}

            {table.status === 'cleaning' && table.paidAt && (
        <p className="type-caption tabular-nums">{table.paidAt} 結清</p>
      )}

            {table.status === 'reserved' && table.reservation && <p className="type-caption">{table.reservation}</p>}
    </div>
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

function BellCall({ call, onDone }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="w-11 shrink-0 type-body font-bold text-ink-900 tabular-nums">
        {call.tableId}
      </span>

      <div className="flex-1">
        <p className="type-body-sm font-bold text-ink-900">{call.request}</p>
        <p className="type-caption text-ink-600 tabular-nums">{call.minutesAgo} 分鐘前</p>
      </div>

      <button
        onClick={() => onDone(call.id)}
        className="inline-flex h-9 items-center rounded-btn bg-surface px-3.5 type-body-sm font-medium text-brand-600 shadow-[inset_0_0_0_1.5px_var(--color-brand-600)] hover:bg-brand-100"
      >
        已處理
      </button>
    </div>
  )
}

// 載入中：側邊欄、header 照常(等harry的完成會再覆蓋掉)，只有桌況區換成灰色骨架
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

      {/* 服務鈴的骨架：標題照常，內容換兩條灰條 */}
      <aside className="w-75 shrink-0">
        <section className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-pop">
          <div className="flex items-center gap-2 bg-surface-2 px-4 py-3 type-body-sm font-bold text-ink-900">
            <SvgIconMap.TableOverviewBell className="size-4.5" />
            服務鈴
          </div>
          <div className="px-4 py-3">
            <div className="h-9 animate-pulse rounded-btn bg-surface-2" />
          </div>
          <div className="px-4 py-3">
            <div className="h-9 animate-pulse rounded-btn bg-surface-2" />
          </div>
        </section>
      </aside>
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

// 右上角「即時同步中」。之後接 WebSocket 再依連線狀態切換
function SyncIndicator() {
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
  const [tableList, setTableList] = useState([])
  const [calls, setCalls] = useState(initialBellCalls)
  const [doneCount, setDoneCount] = useState(14)
  const [cleaningTable, setCleaningTable] = useState(null)
  const availableCount = tableList.filter((table) => table.status === 'available').length
  const occupiedCount = tableList.filter((table) => table.status === 'occupied').length
  const cleaningCount = tableList.filter((table) => table.status === 'cleaning').length
  const reservedCount = tableList.filter((table) => table.status === 'reserved').length

  const [viewState, setViewState] = useState('loading')
  const [reloadKey, setReloadKey] = useState(0)

  // 畫面出現時（以及按「重試」時）去後端拿桌況
  useEffect(() => {
    const controller = new AbortController()

    fetchTables(controller.signal)
      .then((data) => {
        setTableList(data.map(toTableCard))
        setViewState('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setViewState('error')
      })

    return () => controller.abort()
  }, [reloadKey])

  // 顯示空資料的兩種情況：
  // 1. 網址 ?state=empty（demo 用）
  // 2. 狀態正常，但真的一張桌子都沒有（之後接後端就靠這個）
  const showEmpty = viewState === 'empty' || (viewState === 'ready' && tableList.length === 0)

  function handleDone(id) {
    setCalls(calls.filter((call) => call.id !== id))
    setDoneCount(doneCount + 1)
  }

  function handleConfirmClean() {
    // 之後接後端：先送 POST /api/admin/tables/{id}/clean，成功才執行下面
    setTableList(
      tableList.map((table) =>
        table.id === cleaningTable.id ? { id: table.id, status: 'available' } : table,
      ),
    )
    setCleaningTable(null)
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
        tag="今天 9/13（日）"
        childrenRight={
          <>
            <SyncIndicator />
            <BellButtonPlaceholder />
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
        <div className="flex items-start gap-6 p-6">
          <main className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex items-center gap-6 rounded-card border border-line bg-surface px-5 py-4">
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

              <div className="w-px self-stretch bg-line" />

              <StatItem count={4} label="待報到預約" countClass="text-accent-600" />

              <div className="w-px self-stretch bg-line" />

              <StatItem count={waitinglist.length} label="組候位中" />
            </div>

            <div className="grid grid-cols-4 gap-card-gap">
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
                <span className="type-caption text-ink-600">平均等 22 分</span>

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

          <aside className="w-75 shrink-0">
            <section className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-pop">
              <div className="flex items-center gap-2 bg-surface-2 px-4 py-3 type-body-sm font-bold text-ink-900">
                <SvgIconMap.TableOverviewBell className="size-4.5" />
                服務鈴
                <div className="flex-1" />
                <span className="rounded-pill bg-danger px-2.5 py-0.5 type-caption text-white">
                  {calls.length}
                </span>
              </div>

              {calls.map((call) => (
                <BellCall key={call.id} call={call} onDone={handleDone} />
              ))}

              <p className="px-4 py-3 text-center type-caption text-ink-600">
                今天已處理 {doneCount} 則
              </p>
            </section>
          </aside>
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
function toTableCard(t) {
  return {
    id: t.tableNo,
    tableId: t.tableId,
    status: t.displayStatus.toLowerCase(),
    adults: t.adultCount,
    kids: t.childCount,
    minutes: t.openedAt ? Math.floor((Date.now() - new Date(t.openedAt)) / 60000) : null,
  }
}

export default TableOverview
