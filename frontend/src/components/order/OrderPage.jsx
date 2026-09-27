import Sidebar from './Sidebar'
import OrderHeader from './OrderHeader'
import OrderRecord from './OrderRecord'
import Checkout from './Checkout'

export default function OrderPage() {
  return (
    <div className="flex min-h-screen bg-[#F8F5EF] text-[#2B211C]">
      {/* 左側選單 */}
      <Sidebar />

      {/* 右側內容 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 上方 Header */}
        <OrderHeader />

        {/* 主要內容 */}
        <main className="flex min-h-0 flex-1 gap-6 p-6">
          {/* 左邊點餐紀錄 */}
          <section className="min-w-0 flex-1">
            <OrderRecord />
          </section>

          {/* 右邊結帳 */}
          <aside className="w-[360px] shrink-0">
            <Checkout />
          </aside>
        </main>
      </div>
    </div>
  )
}
