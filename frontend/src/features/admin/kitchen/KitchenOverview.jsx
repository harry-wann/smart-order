import TopBar from '@/components/dashboard/TopBar'
import OrderCard from '@/components/OrderCard'
import { useState, useEffect, useCallback } from 'react'
import { useKitchenSocket } from '@/services/realtime/useKitchenSocket'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { employeeClient } from '@/services/client/employeeClient'


const kitchenKey = ['kitchen', 'tickets']
const completedCountKey = ['kitchen', 'completed-count']

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
      optionsSummary: item.options.join('、'),
      note: item.note,
    })),
  }))
}

async function fetchCompletedTicketCount() {
  const { data } = await employeeClient.get('/admin/kitchen/tickets/completed-count')
  return data
}

function KitchenOverview() {
  const queryClient = useQueryClient()
  const {
    data: orderTickets = [],
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

  useKitchenSocket(refreshTickets)
  const [now, setNow] = useState(new Date())
  const [completeError, setCompleteError] = useState('')
  const [itemActionError, setItemActionError] = useState('')
  const [savingItemIds, setSavingItemIds] = useState([])

  const handleCompleteTicket = async (ticketId) => {
    setCompleteError('')
    try {
      await employeeClient.patch(`/admin/kitchen/tickets/${ticketId}/complete`)
      await queryClient.invalidateQueries({ queryKey: ['kitchen'] })
    } catch (error) {
      console.error('整單出完失敗', error)
      setCompleteError('整單出完失敗，請稍後重試。')
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  const handleToggle = (itemId) => {
    setItemActionError('')
    setSavingItemIds((current) => [...current, itemId])

    void employeeClient
      .patch(`/admin/order-items/${itemId}/serve`)
      .then(() => queryClient.invalidateQueries({ queryKey: kitchenKey }))
      .catch((error) => {
        console.error('標記品項已出餐失敗', error)
        setItemActionError('標記品項已出餐失敗，請稍後重試。')
      })
      .finally(() => {
        setSavingItemIds((current) => current.filter((id) => id !== itemId))
      })
  }

  const getMaxWaitMinutes = () => {
    if (!orderTickets || orderTickets.length === 0) {
      return { minutes: 0, tableNo: '' }
    }

    const oldestTicket = orderTickets.reduce((oldest, current) => {
      const oldestTime = new Date(oldest.placedAt).getTime()
      const currentTime = new Date(current.placedAt).getTime()

      return currentTime < oldestTime ? current : oldest
    })

    const diff = Date.now() - new Date(oldestTicket.placedAt).getTime()
    const minutes = Math.max(0, Math.floor(diff / 60000))

    return {
      minutes: minutes,
      tableNo: oldestTicket.tableNo,
    }
  }

  const activeOrdersCount = orderTickets.length
  const { minutes: maxMinutes, tableNo: maxTableNo } = getMaxWaitMinutes()
  const currentTime = now.toTimeString().slice(0, 5)

  if (isPending) return <div className="p-6">載入廚房訂單中…</div>
  if (isError) return <div className="p-6 text-danger">廚房訂單載入失敗，請稍後重試。</div>

  return (
    <div className="flex h-full flex-col bg-paper text-ink-900">
      <TopBar
        childrenLeft={
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-sm font-medium">
              <span className="rounded-full bg-ink-900 px-4 py-1 font-semibold text-surface">
                進行中 {activeOrdersCount} 單
              </span>
              <span className="font-medium text-ink-600">最近完成 {completedCount}</span>
            </div>
          </div>
        }
        childrenRight={
          <div className="flex items-center gap-6 text-sm font-medium">
            {maxMinutes > 0 ? (
              <span className="font-semibold text-danger">
                最久等待 {maxMinutes} 分 {maxTableNo}
              </span>
            ) : (
              <span className="text-ink-600">目前無等待中訂單</span>
            )}
            <span className="font-normal text-ink-400">鼎沸鍋物 廚房 1 號機</span>
            <span className="text-2xl font-black tracking-wider text-ink-900">{currentTime}</span>
          </div>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {completeError && (
          <div className="px-6 pt-4 text-danger" role="alert">
            {completeError}
          </div>
        )}
        {itemActionError && (
          <div className="px-6 pt-4 text-danger" role="alert">
            {itemActionError}
          </div>
        )}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] content-start gap-5 p-6">
          {orderTickets.map((ticket) => {
            return (
              <div key={ticket.id} className="w-full">
                <OrderCard
                  ticketId={ticket.id}
                  tableNo={ticket.tableNo}
                  sequenceNo={ticket.sequenceNo}
                  placedAt={ticket.placedAt}
                  orderItems={ticket.orderItems}

                  onToggle={handleToggle}
                  savingItemIds={savingItemIds}
                  onComplete={handleCompleteTicket}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default KitchenOverview
