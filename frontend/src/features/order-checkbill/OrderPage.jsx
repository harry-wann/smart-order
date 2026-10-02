import { useState } from 'react'
import OrderRecord from './OrderRecord'
import Checkout from './Checkout'
import PaymentProcessing from './PaymentProcessing'
import TopBar from '../../components/dashboard/TopBar'

export default function OrderPage() {
  // null = 沒有付款
  // credit = 信用卡
  // cash = 現金
  const [paymentMethod, setPaymentMethod] = useState(null)

  // 桌位資訊
  const tableInfo = '4人桌'
  const diningStatus = '用餐中'
  const seatedTime = '18:55'
  const diningMinutes = 84

  // 金額
  const subtotal = 1420
  const serviceFee = 142

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface text-ink-900">
      {/* 上方資訊列 */}
      <TopBar
        tag={tableInfo}
        childrenLeft={
          <span className="rounded-full bg-accent-500 px-3 py-1 type-caption font-medium text-ink-900">
            {diningStatus}
          </span>
        }
        childrenRight={
          <span className="text-sm text-ink-600">
            {seatedTime} 入座・已 {diningMinutes} 分鐘
          </span>
        }
      />

      {/* 主要內容 */}
      <main className="flex min-h-0 flex-1 gap-6 p-6">
        {/* 左邊：點餐紀錄 */}
        <section className="min-w-0 flex-1">
          <OrderRecord />
        </section>

        {/* 右邊：結帳 */}
        <aside className="w-90">
          <Checkout
            onCreditCard={() => setPaymentMethod('credit')}
            onCash={() => setPaymentMethod('cash')}
          />
        </aside>
      </main>

      {/* 付款畫面 */}
      {paymentMethod && (
        <PaymentProcessing
          paymentMethod={paymentMethod}
          subtotal={subtotal}
          serviceFee={serviceFee}
          onCancel={() => setPaymentMethod(null)}
          onComplete={() => setPaymentMethod(null)}
        />
      )}
    </div>
  )
}
