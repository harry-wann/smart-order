import '../kds/kds.colors.css'
import OrderCard from '../../../components/OrderCard'
import { useState, useEffect } from 'react'
export default function Kitchen() {
  const [orderTickets, setOrderTickets] = useState([
    {
      id: 1,
      tableNo: 'A03',
      sequenceNo: 1,
      status: 'PENDING',
      isPreorder: false,
      placedAt: new Date(Date.now() - 2 * 60000).toISOString(),
      orderItems: [
        {
          id: 1,
          itemNameSnapshot: '招牌麻辣鍋底',
          quantity: 2,
          status: 'PENDING',
          optionsSummary: '不要辣',
        },
        {
          id: 2,
          itemNameSnapshot: '安格斯霜降牛五花',
          quantity: 2,
          status: 'PENDING',
          optionsSummary: '不要白飯',
        },
      ],
    },
    {
      id: 2,
      tableNo: 'B05',
      sequenceNo: 2,
      status: 'PENDING',
      isPreorder: false,
      placedAt: new Date(Date.now() - 4 * 60000).toISOString(),
      orderItems: [
        {
          id: 3,
          itemNameSnapshot: '海鮮拼盤',
          quantity: 2,
          status: 'PENDING',
          optionsSummary: '',
        },
      ],
    },
    {
      id: 3,
      tableNo: 'C02',
      sequenceNo: 1,
      status: 'PENDING',
      isPreorder: false,
      placedAt: new Date(Date.now() - 12 * 60000).toISOString(),
      orderItems: [
        {
          id: 4,
          itemNameSnapshot: '養生白味鍋底',
          quantity: 1,
          status: 'PENDING',
          optionsSummary: '加蔥',
        },
        {
          id: 5,
          itemNameSnapshot: '伊比利梅花豬',
          quantity: 3,
          status: 'PENDING',
          optionsSummary: '',
        },
        {
          id: 6,
          itemNameSnapshot: '綜合鮮菇盤',
          quantity: 1,
          status: 'SERVED',
          optionsSummary: '',
        },
      ],
    },
    {
      id: 4,
      tableNo: 'A05',
      sequenceNo: 1,
      status: 'PENDING',
      isPreorder: true,
      placedAt: new Date(Date.now() - 25 * 60000).toISOString(),
      orderItems: [
        {
          id: 7,
          itemNameSnapshot: '頂級日本A5和牛',
          quantity: 1,
          status: 'PENDING',
          optionsSummary: '肉切厚一點',
        },
        {
          id: 8,
          itemNameSnapshot: '手工蝦仁漿',
          quantity: 2,
          status: 'PENDING',
          optionsSummary: '',
        },
      ],
    },
    {
      id: 5,
      tableNo: 'A03',
      sequenceNo: 2,
      status: 'PENDING',
      isPreorder: false,
      placedAt: new Date(Date.now() - 0 * 60000).toISOString(),
      orderItems: [
        {
          id: 9,
          itemNameSnapshot: '老油條',
          quantity: 2,
          status: 'PENDING',
          optionsSummary: '',
        },
        {
          id: 10,
          itemNameSnapshot: '冰鎮烏梅汁',
          quantity: 1,
          status: 'PENDING',
          optionsSummary: '去冰',
        },
      ],
    },
    {
      id: 6,
      tableNo: 'V01',
      sequenceNo: 1,
      status: 'PENDING',
      isPreorder: false,
      placedAt: new Date(Date.now() - 8 * 60000).toISOString(),
      orderItems: [
        {
          id: 11,
          itemNameSnapshot: '秘製滷大腸',
          quantity: 1,
          status: 'PENDING',
          optionsSummary: '另外放',
        },
        {
          id: 12,
          itemNameSnapshot: '招牌麻辣鍋底',
          quantity: 1,
          status: 'PENDING',
          optionsSummary: '大辣',
        },
      ],
    },
  ])
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  const handleToggle = (itemId) => {
    setOrderTickets((prevTickets) =>
      prevTickets.map((ticket) => ({
        ...ticket,
        orderItems: ticket.orderItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: item.status === 'PENDING' ? 'SERVED' : 'PENDING',
              }
            : item,
        ),
      })),
    )
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

  return (
    <main className="kds flex min-h-screen w-full flex-col">
      <header className="flex items-center justify-between border-b border-(--kds-line) bg-(--kds-topbar) px-6 py-4">
        <div className="flex items-center gap-6">
          <h1 className="text-[28px] font-bold tracking-wider text-[#F3EAE0]">出菜看板</h1>
          <div className="flex items-center gap-4 text-sm font-medium">
            <span className="rounded-full bg-[#4a3a31] px-4 py-1 text-[#F3EAE0]">
              進行中 {activeOrdersCount} 單
            </span>
            <span className="text-(--kds-ink-3)">最近完成 23</span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm font-medium">
          {maxMinutes > 0 ? (
            <span className="text-(--kds-late)">
              最久等待 {maxMinutes} 分 {maxTableNo}
            </span>
          ) : (
            <span className="text-(--kds-ink-3)">目前無等待中訂單</span>
          )}
          <span className="text-(--kds-ink-2)">鼎沸鍋物 廚房 1 號機</span>
          <span className="text-2xl font-bold tracking-wider text-[#F3EAE0]">{currentTime}</span>
        </div>
      </header>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] content-start gap-5 p-6">
        {orderTickets.map((ticket) => {
          return (
            <div key={ticket.id} className="w-full">
              <OrderCard
                tableNo={ticket.tableNo}
                sequenceNo={ticket.sequenceNo}
                isPreorder={ticket.isPreorder}
                placedAt={ticket.placedAt}
                orderItems={ticket.orderItems}

                onToggle={handleToggle}
                onComplete={() => console.log('出單', ticket.id)}
              />
            </div>
          )
        })}
      </div>
    </main>
  )
}
