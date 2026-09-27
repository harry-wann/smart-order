import '../kds/kds.colors.css'
import OrderCard from '../../../components/OrderCard'
import { useState } from 'react'
export default function Kitchen() {
  const [orders, setOrders] = useState([
    { orderId: 'ORD-001', tableName: 'A03', whichorder: 1, waitingTime: 2 },
    { orderId: 'ORD-002', tableName: 'B05', whichorder: 2, waitingTime: 15 },
  ])

  const [demands, setDemands] = useState([
    {
      id: 1,
      orderId: 'ORD-001',
      demand: '招牌麻辣鍋底',
      quantity: '2',
      // 數量
      isCompleted: false,
      customized: '不要辣',
    },
    {
      id: 2,
      orderId: 'ORD-001',
      demand: '安格斯霜降牛五花',
      quantity: '2',
      isCompleted: false,
      customized: '不要白飯',
    },
    {
      id: 3,
      orderId: 'ORD-002',
      demand: '海鮮拼盤',
      quantity: '2',
      isCompleted: false,
      customized: '',
    },
  ])

  const handleToggle = (id) => {
    setDemands((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isCompleted: !item.isCompleted } : item)),
    )
  }

  return (
    <main className="kds flex min-h-screen w-full flex-col">
      <header className="flex items-center justify-between border-b border-(--kds-line) bg-(--kds-topbar) px-6 py-4">
        <div className="flex items-center gap-6">
          <h1 className="text-[28px] font-bold tracking-wider text-[#F3EAE0]">出菜看板</h1>
          <div className="flex items-center gap-4 text-sm font-medium">
            <span className="rounded-full bg-[#4a3a31] px-4 py-1 text-[#F3EAE0]">進行中 5 單</span>
            <span className="text-(--kds-ink-3)">最近完成 23</span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm font-medium">
          <span className="text-(--kds-late)">最久等待 16 分 A05</span>
          <span className="text-(--kds-ink-2)">鼎沸鍋物 廚房 1 號機</span>
          <span className="text-2xl font-bold tracking-wider text-[#F3EAE0]">19:24</span>
        </div>
      </header>

      <div className="flex flex-1 items-start gap-5 overflow-x-auto p-6">
        {orders.map((order) => {
          // console.log('order', order)

          const currentOrderDemands = demands.filter((item) => item.orderId === order.orderId)
          // console.log('currentOrderDemands', currentOrderDemands)

          return (
            <div key={order.orderId} className="w-[320px] shrink-0">
              <OrderCard
                tableName={order.tableName}
                whichorder={order.whichorder}
                waitingTime={order.waitingTime}
                demand={currentOrderDemands}
                onToggle={handleToggle}
                onComplete={() => console.log('出單', order.orderId)}
              />
            </div>
          )
        })}
      </div>
    </main>
  )
}
