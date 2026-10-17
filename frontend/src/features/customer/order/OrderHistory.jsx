import React from 'react'
import CustomerTopBar from '@/components/CustomerTopBar'
import { SvgIconMap } from '@/assets/SvgIconMap'
import SOButton from '../../../components/SOButton'

// 原檔名 Ticket.jsx
// 原路徑 src/components
// 原 component 名 Ticket

const mockTableOrderData = {
  tableInfo: {
    tableName: 'A03 桌',
    guestCount: 3,
    totalAmount: 1420,
    seatedTime: '18:32',
    elapsedMinutes: 47,
    lastSyncTime: '19:19',
    note: '目前金額（未含服務費）',
  },
  orders: [
    {
      orderId: 'order-2',
      orderTitle: '第 2 單',
      badgeText: '剛送出',
      badgeCol: 'wait',
      submitTime: '18:51',
      isUrgent: true,
      items: [
        {
          id: 'item-1',
          name: '安格斯霜降牛五花',
          quantity: 1,
          statusText: '製作中',
          statusCol: 'wait',
          iconType: 'clock',
          specs: '全份・加蔥花・備註：不要太生',
        },
        {
          id: 'item-2',
          name: '白飯',
          quantity: 2,
          statusText: '製作中',
          statusCol: 'wait',
          iconType: 'clock',
          specs: '免費續加',
        },
      ],
    },
    {
      orderId: 'order-1',
      orderTitle: '第 1 單',
      badgeText: null,
      badgeCol: null,
      submitTime: '18:32',
      isUrgent: false,
      items: [
        {
          id: 'item-3',
          name: '招牌麻辣鍋底',
          quantity: 1,
          statusText: '已出餐',
          statusCol: 'done',
          iconType: 'check',
          specs: '',
        },
        {
          id: 'item-4',
          name: '伊比利豬梅花',
          quantity: 1,
          statusText: '已出餐',
          statusCol: 'done',
          iconType: 'check',
          specs: '',
        },
        {
          id: 'item-5',
          name: '高麗菜',
          quantity: 1,
          statusText: '製作中',
          statusCol: 'plain',
          iconType: 'clock',
          specs: '',
        },
      ],
    },
  ],
}

export default function OrderHistory() {
  const { tableInfo, orders } = mockTableOrderData

  const renderBadge = (text, color) => {
    const colorClass = {
      rec: 'bg-accent-500 text-ink-900',
      wait: 'border border-warning-line bg-warning-bg text-hold-ink',
      done: 'bg-success text-surface',
      plain: 'border border-line bg-surface-2 text-ink-600',
    }[color] || 'border border-line bg-surface-2 text-ink-600'

    return (
      <span className={`shrink-0 rounded-pill px-2 py-0.5 text-xs leading-5 font-medium ${colorClass}`}>
        {text}
      </span>
    )
  }

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[375px] flex-col bg-paper font-sans text-ink-900">
      <div className="sticky top-0 z-10 shadow-sm [&>nav]:h-14">
        <CustomerTopBar title="本桌訂單" showBackButton>
          <button className="flex h-11 w-11 items-center justify-center active:opacity-70">
            <SvgIconMap.OrderHeaderBell role="img" aria-label="通知鈴鐺" className="h-6 w-6" />
          </button>
        </CustomerTopBar>
      </div>

      <div className="flex items-center gap-2 bg-success-bg px-4 py-2.5 text-sm font-medium text-success-ink">
        <div className="h-2 w-2 rounded-pill bg-success"></div>
        即時同步中 最後更新 {tableInfo.lastSyncTime}
      </div>

      <div className="flex-1 overflow-y-auto pb-36">
        <div className="px-page pt-4">
          <div className="rounded-card bg-surface p-card shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
            <span className="type-h2 text-ink-900">{tableInfo.tableName}</span>
              <span className="rounded-pill bg-surface-2 px-2.5 py-0.5 type-caption font-medium text-ink-600">
                {tableInfo.guestCount} 位
              </span>
            </div>
            <span className="type-price text-brand-600">
              NT$ {tableInfo.totalAmount.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex justify-between type-caption text-ink-600">
            <span>
              {tableInfo.seatedTime} 入座・已 {tableInfo.elapsedMinutes} 分鐘
            </span>
            <span>{tableInfo.note}</span>
          </div>
          </div>
        </div>

        <div className="flex flex-col gap-card-gap px-page pt-4">
          {orders.map((order) => (
            <section
              key={order.orderId}
              className={`rounded-card border p-card ${
                order.isUrgent
                  ? 'border-brand-600 bg-brand-100'
                  : 'border-line/50 bg-surface shadow-card'
              }`}
            >
              <div className="flex items-center gap-2">
                <h2 className="type-h3 text-ink-900">{order.orderTitle}</h2>
                {order.badgeText && renderBadge(order.badgeText, 'rec')}
                <span className="flex-1" />
                <span className="type-caption whitespace-nowrap text-ink-600">{order.submitTime} 送出</span>
              </div>

              <div className="flex flex-col pt-2">
                {order.items.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <div className={`flex items-start gap-2 py-2 ${index > 0 ? 'border-t border-line' : ''}`}>
                    {item.iconType === 'check' ? (
                      <SvgIconMap.CartTime
                        role="img"
                        aria-label={item.statusText}
                        className="mt-0.5 h-5 w-5 shrink-0"
                      />
                    ) : (
                      <SvgIconMap.TicketTime
                        role="img"
                        aria-label={item.statusText}
                        className="mt-0.5 h-5 w-5 shrink-0"
                      />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-base leading-6 font-medium text-ink-900">
                          {item.name} ×{item.quantity}
                        </span>
                        {renderBadge(item.statusText, item.statusCol)}
                      </div>
                      {item.specs && (
                        <span className="mt-1 type-body-sm text-ink-600">{item.specs}</span>
                      )}
                    </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="fixed right-0 bottom-0 left-0 z-10 mx-auto w-full max-w-[375px] border-t border-line bg-surface px-4 pt-3 pb-6 shadow-pop">
        <p className="mb-3 text-center type-body-sm text-ink-600">用餐完畢請到櫃檯結帳</p>
        <div className="flex gap-3">
          <SOButton type="button" height="h-[52px]" text="繼續加點" />
          <SOButton type="button" height="h-[52px]" variant="secondary" text="我要結帳  " />
        </div>
      </div>
    </div>
  )
}
