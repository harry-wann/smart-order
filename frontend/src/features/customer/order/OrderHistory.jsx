import React, { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { customerClient } from '@/services/client/customerClient'
import { useOrderProgressSocket } from '@/services/realtime/useOrderProgressSocket'
import CustomerTopBar from '@/components/CustomerTopBar'
import { SvgIconMap } from '@/assets/SvgIconMap'
import SOButton from '../../../components/SOButton'

const orderHistoryKey = ['customer', 'order-history']

async function getOrderHistory(signal) {
  const { data } = await customerClient.get('/dining/orders', { signal })
  return data
}

// 頂部連線指示只看真實的 WebSocket 狀態；HTTP 抓資料失敗另外在 FetchError 顯示
const syncStatusView = {
  live: { text: '即時同步中', box: 'bg-success-bg text-success-ink', dot: 'bg-success' },
  connecting: { text: '連線中…', box: 'bg-surface-2 text-ink-600', dot: 'bg-ink-400' },
  offline: { text: '連線中斷，正在重新連線…', box: 'bg-warning-bg text-hold-ink', dot: 'bg-hold-ink' },
}

function SyncStatus({ status, lastUpdated }) {
  const view = syncStatusView[status] ?? syncStatusView.offline
  return (
    <div role="status" className={`flex items-center gap-2 px-4 py-2.5 type-caption font-medium ${view.box}`}>
      <span className={`size-2 shrink-0 rounded-full ${view.dot}`} />
      {view.text}
      {status === 'live' && lastUpdated && <span>最後更新 {lastUpdated}</span>}
    </div>
  )
}

// 已經有畫面資料、只是這次重抓失敗：保留舊資料，另外提示並給重試
function FetchError({ message, onRetry }) {
  return (
    <div role="alert" className="flex items-center gap-3 bg-danger-bg px-4 py-1 type-caption text-danger-ink">
      <span className="min-w-0 flex-1">訂單更新失敗：{message}</span>
      <button type="button" onClick={onRetry} className="min-h-11 shrink-0 px-2 font-medium underline">
        重試
      </button>
    </div>
  )
}

// 本機最後一次成功抓到資料的時間（時:分:秒）
function formatSyncTime(timestamp) {
  return timestamp ? new Date(timestamp).toTimeString().slice(0, 8) : ''
}

export default function OrderHistory() {
  const navigate = useNavigate()
  const [isCheckoutNoticeOpen, setCheckoutNoticeOpen] = useState(false)
  const queryClient = useQueryClient()
  const refreshOrders = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: orderHistoryKey })
  }, [queryClient])
  // 廚房出餐、撤回、取消、報廢後由 WebSocket 通知重抓（M4 4.12）
  const socketStatus = useOrderProgressSocket(refreshOrders)
  const query = useQuery({
    queryKey: orderHistoryKey,
    queryFn: ({ signal }) => getOrderHistory(signal),
    // 輪詢只當備援：連上 WebSocket 時拉長間隔，斷線時縮短
    refetchInterval: socketStatus === 'live' ? 60000 : 15000,
  })
  const isSessionInvalid = query.error?.status === 401

  if (!query.data || isSessionInvalid) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-full bg-paper">
        <CustomerTopBar title="本桌訂單" showBackButton />
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pt-8 text-center" role="status">
          <p className="type-body text-ink-900">
            {query.isPending
              ? '訂單載入中…'
              : isSessionInvalid
                ? '點餐憑證已失效，請重新掃碼'
                : `訂單載入失敗：${query.error?.message ?? '請稍後再試'}`}
          </p>
          {query.isError && (
            <div className="mt-3 w-full max-w-md">
              <SOButton
                type="button"
                variant="default"
                height="h-[52px]"
                text={<span className="type-button">重新載入</span>}
                onClick={() => query.refetch()}
              />
            </div>
          )}
        </div>
      </div>
    )
  }
  const { tableInfo, orders } = query.data

  const renderBadge = (text, color) => {
    const colorClass = {
      rec: 'bg-accent-500 text-ink-900',
      wait: 'bg-warning-bg text-hold-ink shadow-[inset_0_0_0_1px_var(--color-warning-line)]',
      done: 'bg-success text-surface',
      plain: 'bg-surface-2 text-ink-600 shadow-[inset_0_0_0_1px_var(--color-line)]',
    }[color] || 'bg-surface-2 text-ink-600 shadow-[inset_0_0_0_1px_var(--color-line)]'

    return (
      <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-xs leading-[1.6] font-medium ${colorClass}`}>
        {text}
      </span>
    )
  }

  // WASTED：廚房報廢（做壞或退回），不計入帳單
  const getItemStatus = (status) => ({
    text: {
      SERVED: '已出餐',
      CANCELLED: '已取消',
      WASTED: '已退菜',
      PENDING: '待製作',
    }[status] || status,
    color: status === 'SERVED' ? 'done' : status === 'CANCELLED' || status === 'WASTED' ? 'plain' : 'wait',
    // 已取消、已退菜不會再上桌，用淡色的 ×，不要跟「待製作」共用時鐘
    icon: status === 'SERVED' ? 'check' : status === 'CANCELLED' || status === 'WASTED' ? 'none' : 'clock',
  })

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-full flex-col bg-paper font-sans text-ink-900">
      <div className="sticky top-0 z-10 shadow-sm [&>nav]:h-14">
        <CustomerTopBar title="本桌訂單" showBackButton />
      </div>

      <SyncStatus status={socketStatus} lastUpdated={formatSyncTime(query.dataUpdatedAt)} />
      {query.isRefetchError && <FetchError message={query.error.message} onRetry={() => query.refetch()} />}

      <div className="no-scrollbar flex-1 overflow-y-auto pb-36">
        <div className="px-page pt-4">
          <div className="rounded-card border border-line bg-surface p-card shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="type-h2 text-ink-900">{tableInfo.tableNo} 桌</span>
                <span className="rounded-pill bg-surface-2 px-2.5 py-0.5 text-xs leading-[1.6] font-medium text-ink-600 shadow-[inset_0_0_0_1px_var(--color-line)]">
                  {tableInfo.guestCount} 位
                </span>
              </div>
              <span className="type-price text-brand-600">
                NT$ {tableInfo.totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="mt-1 flex justify-between type-caption text-ink-600">
              <span>
                {tableInfo.seatedTime} 入座・已 {tableInfo.elapsedMinutes} 分鐘
              </span>
              <span>目前金額（未含服務費）</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-card-gap px-page pt-4">
          {orders.length === 0 && <p className="py-8 text-center text-ink-600">目前尚無訂單，開始點餐吧。</p>}
          {orders.map((order) => (
            <section
              key={order.orderId}
              className="rounded-card border border-line bg-surface p-card shadow-card"
            >
              <div className="flex items-center gap-2">
                <h2 className="type-h3 text-ink-900">第 {order.sequenceNo} 單</h2>
                {order.status === 'CANCELLED' && renderBadge('已取消', 'plain')}
                <span className="flex-1" />
                <span className="type-caption whitespace-nowrap text-ink-600">{order.submitTime} 送出</span>
              </div>

              <div className="flex flex-col pt-2">
                {order.items.map((item, index) => {
                  const itemStatus = getItemStatus(item.status)
                  const specs = [
                    ...item.options,
                    item.note?.trim() ? `備註：${item.note}` : null,
                  ].filter(Boolean).join('・')

                  return (
                    <React.Fragment key={item.id}>
                    <div className={`flex items-start gap-2 py-2 ${index > 0 ? 'border-t border-line' : ''}`}>
                      {itemStatus.icon === 'check' ? (
                        <SvgIconMap.TicketGreencheck
                          role="img"
                          aria-label={itemStatus.text}
                          className="h-6 w-5.5 shrink-0"
                        />
                      ) : itemStatus.icon === 'none' ? (
                        <SvgIconMap.ModalClose
                          role="img"
                          aria-label={itemStatus.text}
                          className="h-6 w-5.5 shrink-0 p-1 text-ink-400"
                        />
                      ) : (
                        <SvgIconMap.TicketTime
                          role="img"
                          aria-label={itemStatus.text}
                          className="h-6 w-5.5 shrink-0"
                        />
                      )}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-base leading-6 font-medium text-ink-900">
                            {item.name} ×{item.quantity}
                          </span>
                          {renderBadge(itemStatus.text, itemStatus.color)}
                        </div>
                        {specs && (
                          <span className="mt-1 type-caption text-ink-600">{specs}</span>
                        )}
                      </div>
                    </div>
                    </React.Fragment>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="fixed right-0 bottom-0 left-0 z-10 mx-auto w-full max-w-full border-t border-line bg-surface px-4 pt-3 pb-6 shadow-pop">
        <p className="mb-3 text-center type-body-sm text-ink-600">用餐完畢請到櫃檯結帳</p>
        <div className="flex gap-3 [&>button:first-child]:flex-1 [&>button:last-child]:w-auto [&>button:last-child]:shrink-0 [&>button:last-child]:px-6">
          <SOButton type="button" height="h-[52px]" text="繼續加點" onClick={() => navigate('/order/menu')} />
          <SOButton
            type="button"
            height="h-[52px]"
            variant="secondary"
            text="我要結帳"
            onClick={() => setCheckoutNoticeOpen(true)}
          />
        </div>
      </div>

      {isCheckoutNoticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="關閉結帳提醒"
            className="absolute inset-0 bg-ink-900/50"
            onClick={() => setCheckoutNoticeOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-notice-title"
            className="relative w-full max-w-sm rounded-card border border-line bg-surface p-card shadow-pop"
          >
            <h2 id="checkout-notice-title" className="type-h3 text-ink-900">
              結帳提醒
            </h2>
            <p className="mt-2 type-body-sm text-ink-600">
              用餐完畢請到櫃檯結帳。
            </p>
            <div className="mt-6 flex justify-end">
              <SOButton
                type="button"
                height="h-11"
                text="知道了"
                onClick={() => setCheckoutNoticeOpen(false)}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
