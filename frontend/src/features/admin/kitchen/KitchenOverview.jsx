import OrderCard from '@/components/OrderCard'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useKitchenSocket } from '@/services/realtime/useKitchenSocket'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { employeeClient } from '@/services/client/employeeClient'
import { isApiError } from '@/services/client/ApiError'
import './kds.colors.css'

// S-04 出菜看板：沿用後台共用暖色 Token，固定橫式大螢幕，不做 RWD

const kitchenKey = ['kitchen', 'tickets']
const completedCountKey = ['kitchen', 'completed-count']
// 三個 key 都在 ['kitchen'] 底下：推播或操作完成後 invalidate ['kitchen']，進行中、最近完成、完成數一起重抓
const recentKey = ['kitchen', 'recent']
// 等待超過 15 分鐘就是久候（M4 4.6），跟 OrderCard 同一個門檻
const LATE_AFTER_MS = 15 * 60 * 1000
// 單全部出完或被取消時，卡片淡出的時間（M4 4.5）
const FADE_OUT_MS = 500
// 還沒抓到資料時用同一個空陣列，不然每次 render 都是新陣列，會被當成「清單變了」
const NO_TICKETS = []
// 最近完成分頁列的範圍，跟後端 KitchenTicketService 的 RECENT_WINDOW_MINUTES／RECENT_LIMIT 一樣，
// 這裡只用在說明文字；要改的話兩邊一起改
const RECENT_WINDOW_MINUTES = 60
const RECENT_LIMIT = 50
// 停在最近完成分頁時每 60 秒重抓一次：結帳不推廚房事件、單超過 60 分鐘也沒有事件，
// 已結帳的桌和太舊的單要靠定時重抓才會從清單消失
const RECENT_REFETCH_MS = 60 * 1000
const ticketGridClass =
  'grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] content-start items-start gap-6 p-8'

// 進行中（/kitchen/tickets）與最近完成（/kitchen/tickets/recent）共用：兩支 API 的單與品項格式一樣，
// 最近完成的單另外多帶 completedAt（完成時間，最後一道菜出餐的時間），順序也已經由後端排好（完成時間新到舊）
async function fetchKitchenTickets(url) {
  const { data } = await employeeClient.get(url)

  return data.map((ticket) => ({
    id: ticket.orderId,
    tableNo: ticket.tableNo,
    sequenceNo: ticket.sequenceNo,
    status: ticket.status,
    placedAt: ticket.placedAt,
    completedAt: ticket.completedAt ?? null,
    orderItems: ticket.items.map((item) => ({
      id: item.id,
      itemNameSnapshot: item.name,
      quantity: item.quantity,
      status: item.status,
      optionsSummary: item.options.join('・'),
      note: item.note,
    })),
  }))
}

async function fetchCompletedTicketCount() {
  const { data } = await employeeClient.get('/admin/kitchen/tickets/completed-count')
  return data
}

// 頂列的兩個分頁按鈕（設計稿：選中的是實心膠囊，沒選中的只有淡色字）
function viewTabClass(isSelected) {
  return `min-h-11 rounded-pill px-4 type-body font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kds-ink)] ${
    isSelected ? 'bg-[var(--kds-line)] text-[var(--kds-ink)]' : 'text-[var(--kds-ink-3)] hover:text-[var(--kds-ink)]'
  }`
}

// 後端有給原因（例如「已出餐或已完成的餐點不能取消」）就照著顯示，沒有才用預設句
function errorMessage(error, fallback) {
  return isApiError(error) ? error.message : fallback
}

// 跟後端同一個順序：送出時間早的在前
function byPlacedAt(a, b) {
  return new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime() || a.id - b.id
}

// 樂觀更新：還在送出中的勾選（savingItems）與整單出完（completingTicketId）蓋在伺服器資料上面。
// 不直接改 React Query 的快取，是因為 PATCH 還沒完成時，WebSocket 觸發的重抓可能先回來、帶著舊狀態，
// 改快取的話會被蓋回去（勾了又跳回沒勾）；疊在外面就不管重抓幾次，送出中的品項都維持剛勾的樣子
function applyPendingStatus(tickets, savingItems, completingTicketId) {
  if (savingItems.length === 0 && completingTicketId === null) return tickets
  return tickets.map((ticket) => ({
    ...ticket,
    orderItems: ticket.orderItems.map((item) => {
      if (ticket.id === completingTicketId) return { ...item, status: 'SERVED' }
      const saving = savingItems.find((entry) => entry.id === item.id)
      return saving ? { ...item, status: saving.status } : item
    }),
  }))
}

// 最近完成分頁的內容：用餐中的桌已完成的單，品項都是已勾；取消勾選就撤回出餐（unserve），單回到進行中。
// 已完成的卡片沒有整單出完，選單只有報廢細項（客人在全部上菜後才退菜）；也不淡出：
// 撤回後重抓到的清單裡沒有這張單，就直接拿掉
function RecentTickets({
  tickets,
  isPending,
  isError,
  hasData,
  savingItemIds,
  onToggle,
  onWasteItem,
  itemActionPendingId,
}) {
  return (
    <>
      <p className="px-8 pt-4 type-body text-[var(--kds-ink-2)]">
        用餐中的桌最近 {RECENT_WINDOW_MINUTES} 分鐘內完成的單，最新的在前（最多 {RECENT_LIMIT} 張）。勾錯了就取消勾選，這張單會回到「進行中」。
      </p>
      {isError && hasData && (
        <p className="px-8 pt-4 type-body font-bold text-[var(--kds-late)]" role="alert">
          最近完成的單更新失敗，畫面是上一次的資料，請稍後重試。
        </p>
      )}

      {isPending ? (
        <p className="p-8 type-body text-[var(--kds-ink-2)]">載入最近完成的單中…</p>
      ) : isError && !hasData ? (
        <p className="p-8 type-body font-bold text-[var(--kds-late)]" role="alert">
          最近完成的單載入失敗，請稍後重試。
        </p>
      ) : tickets.length === 0 ? (
        <p className="p-8 type-body text-[var(--kds-ink-2)]">最近 {RECENT_WINDOW_MINUTES} 分鐘內沒有完成的單。</p>
      ) : (
        <div className={ticketGridClass}>
          {tickets.map((ticket) => (
            <OrderCard
              key={ticket.id}
              ticketId={ticket.id}
              tableNo={ticket.tableNo}
              sequenceNo={ticket.sequenceNo}
              placedAt={ticket.placedAt}
              completedAt={ticket.completedAt}
              orderItems={ticket.orderItems}
              onToggle={onToggle}
              savingItemIds={savingItemIds}
              onWasteItem={onWasteItem}
              isItemActionPending={ticket.orderItems.some((item) => item.id === itemActionPendingId)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function KitchenOverview() {
  const queryClient = useQueryClient()
  const {
    data: serverTickets = NO_TICKETS,
    isPending,
    isError,
  } = useQuery({
    queryKey: kitchenKey,
    queryFn: () => fetchKitchenTickets('/admin/kitchen/tickets'),
  })
  const { data: completedCount = 0 } = useQuery({
    queryKey: completedCountKey,
    queryFn: fetchCompletedTicketCount,
  })
  // 'active'＝進行中、'recent'＝最近完成
  const [view, setView] = useState('active')
  // 最近完成分頁（S-04）：誤勾最後一道菜、卡片已經淡出的單，在這裡取消勾選就能撤回。
  // 只在看這個分頁時才抓（停在進行中時推播只會把它標成過期），看的期間另外定時重抓
  const {
    data: serverRecentTickets = NO_TICKETS,
    isPending: isRecentPending,
    isError: isRecentError,
  } = useQuery({
    queryKey: recentKey,
    queryFn: () => fetchKitchenTickets('/admin/kitchen/tickets/recent'),
    enabled: view === 'recent',
    refetchInterval: RECENT_REFETCH_MS,
  })

  // 切到最近完成時清掉上一次的清單再抓，抓到之前顯示載入中：停在進行中的期間這份清單沒有更新，
  // 可能還有已經結帳的桌或超過 60 分鐘的單，先顯示出來廚師會以為還能撤回。
  // 先 reset（這時查詢還是停用的，只清資料不會抓），切過去查詢一啟用、沒有資料就會重抓
  const showRecentView = () => {
    if (view === 'recent') return
    void queryClient.resetQueries({ queryKey: recentKey, exact: true })
    setView('recent')
  }

  const refreshTickets = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['kitchen'] })
  }, [queryClient])

  // 送單後 NEW_TICKET 推到 /topic/kitchen 就重抓，卡片 1 秒內出現（M4 4.2）
  const isSocketConnected = useKitchenSocket(refreshTickets)
  const [now, setNow] = useState(() => Date.now())
  const [actionError, setActionError] = useState('')
  // 送出中的勾選：[{ id: 品項 id, status: 'SERVED' | 'PENDING' }]
  const [savingItems, setSavingItems] = useState([])
  const [completingTicketId, setCompletingTicketId] = useState(null)
  const [cancellingTicketId, setCancellingTicketId] = useState(null)
  const [itemActionPendingId, setItemActionPendingId] = useState(null)
  const orderTickets = useMemo(
    () => applyPendingStatus(serverTickets, savingItems, completingTicketId),
    [serverTickets, savingItems, completingTicketId],
  )
  // 最近完成的卡片也疊上送出中的取消勾選：按下去立刻變成沒勾，重抓到後端結果（單回到進行中）才從這裡消失
  const recentTickets = useMemo(
    () => applyPendingStatus(serverRecentTickets, savingItems, null),
    [serverRecentTickets, savingItems],
  )

  // 卡片淡出（M4 4.5）：單從清單消失（全部出完、取消）時，先留在原位淡出 0.5 秒再移除。
  // 在 render 當下跟上一份清單比對，消失的卡片同一次 render 就換成淡出樣式，DOM 不會先被拿掉再加回來
  const [previousTickets, setPreviousTickets] = useState(orderTickets)
  const [leavingTickets, setLeavingTickets] = useState([])
  if (orderTickets !== previousTickets) {
    const currentIds = new Set(orderTickets.map((ticket) => ticket.id))
    const vanished = previousTickets.filter((ticket) => !currentIds.has(ticket.id))
    setPreviousTickets(orderTickets)
    setLeavingTickets((current) => [
      // 撤回出餐後又回到清單的單，不再算淡出中
      ...current.filter((ticket) => !currentIds.has(ticket.id) && !vanished.some((gone) => gone.id === ticket.id)),
      ...vanished,
    ])
  }

  useEffect(() => {
    if (leavingTickets.length === 0) return
    const timer = setTimeout(() => setLeavingTickets([]), FADE_OUT_MS)
    return () => clearTimeout(timer)
  }, [leavingTickets])

  // 每秒更新：頂列時鐘、每張卡的等待分鐘與久候警示都跟著時鐘走（M4 4.6）
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // 勾選與整單出完都先改畫面（觸控要立刻有反應，最後一項勾完淡出時也是全勾的樣子）：
  // 送出期間由 applyPendingStatus 疊上樂觀狀態，完成後重抓到伺服器結果才拿掉，失敗時拿掉就回到伺服器狀態
  const handleCompleteTicket = async (ticketId) => {
    setActionError('')
    setCompletingTicketId(ticketId)
    try {
      await employeeClient.patch(`/admin/kitchen/tickets/${ticketId}/complete`)
      await queryClient.invalidateQueries({ queryKey: ['kitchen'] })
    } catch (error) {
      console.error('整單出完失敗', error)
      setActionError(errorMessage(error, '整單出完失敗，請稍後重試。'))
      void queryClient.invalidateQueries({ queryKey: ['kitchen'] })
    } finally {
      setCompletingTicketId(null)
    }
  }

  // 對話框用的三個操作：成功回 null，失敗回要顯示在對話框裡的訊息
  const handleCancelTicket = async (ticketId, cancelReason) => {
    setCancellingTicketId(ticketId)
    try {
      await employeeClient.patch(`/admin/kitchen/tickets/${ticketId}/cancel`, {
        cancel_reason: cancelReason,
      })
      await queryClient.invalidateQueries({ queryKey: ['kitchen'] })
      return null
    } catch (error) {
      console.error('取消訂單失敗', error)
      return errorMessage(error, '取消訂單失敗，請稍後重試。')
    } finally {
      setCancellingTicketId(null)
    }
  }

  const handleCancelOrderItem = async (itemId, cancelReason) => {
    setItemActionPendingId(itemId)
    try {
      await employeeClient.patch(`/admin/order-items/${itemId}/cancel`, {
        cancel_reason: cancelReason,
      })
      await queryClient.invalidateQueries({ queryKey: ['kitchen'] })
      return null
    } catch (error) {
      console.error('取消餐點失敗', error)
      return errorMessage(error, '取消餐點失敗，請稍後重試。')
    } finally {
      setItemActionPendingId(null)
    }
  }

  // 報廢／退菜（M4 4.9）：記原因、庫存不回補
  const handleWasteOrderItem = async (itemId, reason) => {
    setItemActionPendingId(itemId)
    try {
      await employeeClient.patch(`/admin/order-items/${itemId}/waste`, { reason })
      await queryClient.invalidateQueries({ queryKey: ['kitchen'] })
      return null
    } catch (error) {
      console.error('報廢餐點失敗', error)
      return errorMessage(error, '報廢餐點失敗，請稍後重試。')
    } finally {
      setItemActionPendingId(null)
    }
  }

  const handleToggle = (itemId, isServed) => {
    setActionError('')
    setSavingItems((current) => [...current, { id: itemId, status: isServed ? 'SERVED' : 'PENDING' }])

    void employeeClient
      .patch(`/admin/order-items/${itemId}/${isServed ? 'serve' : 'unserve'}`)
      .catch((error) => {
        console.error(isServed ? '標記品項已出餐失敗' : '撤回已出餐失敗', error)
        setActionError(
          errorMessage(error, isServed ? '標記品項已出餐失敗，請稍後重試。' : '撤回已出餐失敗，請稍後重試。'),
        )
      })
      // 成功或失敗都等重抓完再拿掉樂觀狀態：成功時拿到後端推導後的單狀態（全部出完就淡出），失敗時還原畫面
      .then(() => queryClient.invalidateQueries({ queryKey: ['kitchen'] }))
      .finally(() => {
        setSavingItems((current) => current.filter((entry) => entry.id !== itemId))
      })
  }

  const oldestTicket = orderTickets.reduce(
    (oldest, ticket) => (oldest === null || byPlacedAt(ticket, oldest) < 0 ? ticket : oldest),
    null,
  )
  const maxWaitMs = oldestTicket ? Math.max(0, now - new Date(oldestTicket.placedAt).getTime()) : 0
  const maxWaitMinutes = Math.floor(maxWaitMs / 60000)
  const isMaxWaitLate = maxWaitMs > LATE_AFTER_MS
  const currentTime = new Date(now).toTimeString().slice(0, 5)

  const displayedTickets = [
    ...orderTickets.map((ticket) => ({ ticket, isLeaving: false })),
    ...leavingTickets.map((ticket) => ({ ticket, isLeaving: true })),
  ].sort((a, b) => byPlacedAt(a.ticket, b.ticket))

  return (
    <div className="kds-theme flex h-full flex-col bg-[var(--kds-bg)] text-[var(--kds-ink)]">
      <header className="flex h-19 shrink-0 items-center gap-6 border-b border-[var(--kds-line)] bg-[var(--kds-topbar)] px-8">
        <h1 className="shrink-0 whitespace-nowrap type-h1">出菜看板</h1>
        <div role="group" aria-label="看板分頁" className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={view === 'active'}
            onClick={() => setView('active')}
            className={viewTabClass(view === 'active')}
          >
            進行中 {orderTickets.length} 單
          </button>
          <button
            type="button"
            aria-pressed={view === 'recent'}
            onClick={showRecentView}
            className={viewTabClass(view === 'recent')}
          >
            最近完成
          </button>
        </div>
        {/* 24 小時內完成的單數（completed-count）。不放在「最近完成」按鈕上：分頁只列最近 60 分鐘、還在用餐的桌，
            數字放按鈕上會變成「最近完成 37」點進去卻是空的 */}
        <span className="type-body-sm text-[var(--kds-ink-3)]">24 小時完成 {completedCount} 單</span>
        <span className="flex-1" />
        {isSocketConnected === false && (
          <span role="status" className="type-body font-bold text-[var(--kds-late)]">
            即時連線中斷，正在重新連線…
          </span>
        )}
        {oldestTicket ? (
          <span
            className={`type-body ${isMaxWaitLate ? 'font-bold text-[var(--kds-late)]' : 'text-[var(--kds-ink-2)]'}`}
          >
            最久等待 {maxWaitMinutes} 分 {oldestTicket.tableNo}
          </span>
        ) : (
          <span className="type-body text-[var(--kds-ink-2)]">目前無等待中訂單</span>
        )}
        <span className="type-body text-[var(--kds-ink-3)]">鼎沸鍋物 廚房 1 號機</span>
        <span className="type-h1 tabular-nums">{currentTime}</span>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {actionError && (
          <p className="px-8 pt-4 type-body font-bold text-[var(--kds-late)]" role="alert">
            {actionError}
          </p>
        )}
        {view === 'active' && isError && serverTickets !== NO_TICKETS && (
          <p className="px-8 pt-4 type-body font-bold text-[var(--kds-late)]" role="alert">
            廚房訂單更新失敗，畫面是上一次的資料，請稍後重試。
          </p>
        )}

        {view === 'recent' ? (
          <RecentTickets
            tickets={recentTickets}
            isPending={isRecentPending}
            isError={isRecentError}
            hasData={serverRecentTickets !== NO_TICKETS}
            savingItemIds={savingItems.map((entry) => entry.id)}
            onToggle={handleToggle}
            onWasteItem={handleWasteOrderItem}
            itemActionPendingId={itemActionPendingId}
          />
        ) : isPending ? (
          <p className="p-8 type-body text-[var(--kds-ink-2)]">載入廚房訂單中…</p>
        ) : isError && serverTickets === NO_TICKETS ? (
          <p className="p-8 type-body font-bold text-[var(--kds-late)]" role="alert">
            廚房訂單載入失敗，請稍後重試。
          </p>
        ) : displayedTickets.length === 0 ? (
          <p className="p-8 type-body text-[var(--kds-ink-2)]">目前沒有待出的餐點。</p>
        ) : (
          <div className={ticketGridClass}>
            {displayedTickets.map(({ ticket, isLeaving }) => (
              <OrderCard
                key={ticket.id}
                ticketId={ticket.id}
                tableNo={ticket.tableNo}
                sequenceNo={ticket.sequenceNo}
                placedAt={ticket.placedAt}
                orderItems={ticket.orderItems}
                now={now}
                isLeaving={isLeaving}
                onToggle={handleToggle}
                savingItemIds={savingItems.map((entry) => entry.id)}
                onComplete={handleCompleteTicket}
                isCompleting={completingTicketId === ticket.id}
                onCancel={handleCancelTicket}
                isCancelling={cancellingTicketId === ticket.id}
                onCancelItem={handleCancelOrderItem}
                onWasteItem={handleWasteOrderItem}
                isItemActionPending={ticket.orderItems.some((item) => item.id === itemActionPendingId)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default KitchenOverview
