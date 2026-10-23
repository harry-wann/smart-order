import OrderCard from '@/components/OrderCard'
import { useState, useEffect, useCallback } from 'react'
import { useKitchenSocket } from '@/services/realtime/useKitchenSocket'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { employeeClient } from '@/services/client/employeeClient'
import { isApiError } from '@/services/client/ApiError'
import './kds.colors.css'

// S-04 出菜看板：全站唯一的深色頁面（M4 4.10），固定橫式大螢幕，不做 RWD

const kitchenKey = ['kitchen', 'tickets']
const completedCountKey = ['kitchen', 'completed-count']
// 等待超過 15 分鐘就是久候（M4 4.6），跟 OrderCard 同一個門檻
const LATE_AFTER_MS = 15 * 60 * 1000
// 單全部出完或被取消時，卡片淡出的時間（M4 4.5）
const FADE_OUT_MS = 500
// 還沒抓到資料時用同一個空陣列，不然每次 render 都是新陣列，會被當成「清單變了」
const NO_TICKETS = []

async function fetchKitchenTickets() {
  const { data } = await employeeClient.get('/admin/kitchen/tickets')

  return data.map((ticket) => ({
    id: ticket.orderId,
    tableNo: ticket.tableNo,
    sequenceNo: ticket.sequenceNo,
    status: ticket.status,
    placedAt: ticket.placedAt,
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

// 後端有給原因（例如「已出餐或已完成的餐點不能取消」）就照著顯示，沒有才用預設句
function errorMessage(error, fallback) {
  return isApiError(error) ? error.message : fallback
}

// 跟後端同一個順序：送出時間早的在前
function byPlacedAt(a, b) {
  return new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime() || a.id - b.id
}

function KitchenOverview() {
  const queryClient = useQueryClient()
  const {
    data: orderTickets = NO_TICKETS,
    isPending,
    isError,
  } = useQuery({
    queryKey: kitchenKey,
    queryFn: fetchKitchenTickets,
  })
  const { data: completedCount = 0 } = useQuery({
    queryKey: completedCountKey,
    queryFn: fetchCompletedTicketCount,
  })

  const refreshTickets = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['kitchen'] })
  }, [queryClient])

  // 送單後 NEW_TICKET 推到 /topic/kitchen 就重抓，卡片 1 秒內出現（M4 4.2）
  const isSocketConnected = useKitchenSocket(refreshTickets)
  const [now, setNow] = useState(() => Date.now())
  const [actionError, setActionError] = useState('')
  const [savingItemIds, setSavingItemIds] = useState([])
  const [completingTicketId, setCompletingTicketId] = useState(null)
  const [cancellingTicketId, setCancellingTicketId] = useState(null)
  const [itemActionPendingId, setItemActionPendingId] = useState(null)

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

  // 勾選先改畫面上的狀態（觸控要立刻有反應，最後一項勾完淡出時也是全勾的樣子），失敗再重抓還原
  const markServedLocally = (shouldChange, isServed) => {
    void queryClient.cancelQueries({ queryKey: kitchenKey })
    queryClient.setQueryData(kitchenKey, (tickets) =>
      tickets?.map((ticket) => ({
        ...ticket,
        orderItems: ticket.orderItems.map((item) =>
          shouldChange(ticket, item) ? { ...item, status: isServed ? 'SERVED' : 'PENDING' } : item,
        ),
      })),
    )
  }

  const handleCompleteTicket = async (ticketId) => {
    setActionError('')
    setCompletingTicketId(ticketId)
    markServedLocally((ticket) => ticket.id === ticketId, true)
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
    setSavingItemIds((current) => [...current, itemId])
    markServedLocally((ticket, item) => item.id === itemId, isServed)

    void employeeClient
      .patch(`/admin/order-items/${itemId}/${isServed ? 'serve' : 'unserve'}`)
      .catch((error) => {
        console.error(isServed ? '標記品項已出餐失敗' : '撤回已出餐失敗', error)
        setActionError(
          errorMessage(error, isServed ? '標記品項已出餐失敗，請稍後重試。' : '撤回已出餐失敗，請稍後重試。'),
        )
      })
      // 成功或失敗都重抓：成功時拿到後端推導後的單狀態（全部出完就淡出），失敗時還原畫面
      .then(() => queryClient.invalidateQueries({ queryKey: ['kitchen'] }))
      .finally(() => {
        setSavingItemIds((current) => current.filter((id) => id !== itemId))
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
        <h1 className="type-h1">出菜看板</h1>
        <span className="rounded-pill bg-[var(--kds-line)] px-4 py-1 type-body font-medium">
          進行中 {orderTickets.length} 單
        </span>
        <span className="type-body text-[var(--kds-ink-3)]">最近完成 {completedCount}</span>
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
        {isError && orderTickets !== NO_TICKETS && (
          <p className="px-8 pt-4 type-body font-bold text-[var(--kds-late)]" role="alert">
            廚房訂單更新失敗，畫面是上一次的資料，請稍後重試。
          </p>
        )}

        {isPending ? (
          <p className="p-8 type-body text-[var(--kds-ink-2)]">載入廚房訂單中…</p>
        ) : isError && orderTickets === NO_TICKETS ? (
          <p className="p-8 type-body font-bold text-[var(--kds-late)]" role="alert">
            廚房訂單載入失敗，請稍後重試。
          </p>
        ) : displayedTickets.length === 0 ? (
          <p className="p-8 type-body text-[var(--kds-ink-2)]">目前沒有待出的餐點。</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] content-start items-start gap-6 p-8">
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
                savingItemIds={savingItemIds}
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
