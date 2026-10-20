import { useNavigate } from 'react-router'
import CustomerTopBar from '@/components/CustomerTopBar.tsx'
import InfoBox from '@/components/InfoBox.tsx'
import SOButton from '@/components/SOButton.tsx'
import OrderMap from '@/components/OrderMap.jsx'
import { SvgIconMap } from '@/assets/SvgIconMap.tsx'
import { customerTokens } from '@/services/client/tokenStore.ts'
import { useBill } from '@/services/api/checkout/checkoutApi.js'

const money = (n) => `NT$ ${Number(n ?? 0).toLocaleString()}`

function SumRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="type-body text-ink-900">{label}</span>
      <span className="type-body font-bold text-ink-900 tabular-nums">{value}</span>
    </div>
  )
}

export default function OrderDetails() {
  const navigate = useNavigate()
  const query = useBill()
  const isMember = Boolean(customerTokens.member.get())

  if (!query.data) {
    return (
      <div className="mx-auto min-h-screen w-full bg-paper">
        <CustomerTopBar title="結帳明細" showBackButton />
        <div className="flex flex-col items-center gap-3 px-page pt-8 text-center" role="status">
          <p className="type-body text-ink-900">
            {query.isPending ? '帳單載入中…' : query.error?.message ?? '帳單讀取失敗'}
          </p>
          {query.isError && (
            <div className="w-full">
              <SOButton variant="secondary" height="h-11" text="重新載入" onClick={() => query.refetch()} />
            </div>
          )}
        </div>
      </div>
    )
  }

  const bill = query.data
  const hasOrders = bill.orders.length > 0
  const perPerson = bill.guestCount > 0 ? Math.round(bill.total / bill.guestCount) : bill.total

  return (
    <div className="relative mx-auto flex min-h-screen w-full flex-col bg-paper text-ink-900">
      <div className="sticky top-0 z-10">
        <CustomerTopBar
          title="結帳明細"
          subTitle={`${bill.tableNo} 桌 ${bill.openedAt} – ${bill.now}`}
          showBackButton
        />
      </div>

      <div className="flex-1 overflow-y-auto px-page pt-4 pb-32">
        <InfoBox icon="circle" col="info" text="F" custimtext="付款成功後這桌就不能再加點" />

        <div className="flex flex-col gap-card-gap">
          <OrderMap orders={bill.orders} />

          <section className="rounded-card border border-line bg-surface p-card shadow-card">
            <SumRow label={`小計 ${bill.itemCount} 項`} value={money(bill.subtotal)} />
            <SumRow label="服務費 10%" value={money(bill.serviceFee)} />

            <div className="my-2 border-t border-line" />

            <div className="flex items-center justify-between py-2">
              <span className="type-h2 text-ink-900">合計</span>
              <span className="type-display text-brand-600 tabular-nums">{money(bill.total)}</span>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-btn bg-surface-2 px-4 py-3">
              <SvgIconMap.CheckoutBlackpeople aria-hidden="true" className="size-4.5 shrink-0" />
              <span className="flex-1 type-body-sm text-ink-600">{bill.guestCount} 位均分，每人約</span>
              <span className="type-body font-bold text-ink-900 tabular-nums">{money(perPerson)}</span>
            </div>
          </section>

          {!isMember && (
            <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-card shadow-card">
              <div>
                <h2 className="type-h3 text-ink-900">登入會員，這次消費會記到你的帳戶</h2>
                <p className="mt-1 type-body-sm text-ink-600">付款完成後就不能再補登入了。</p>
              </div>
              <SOButton
                variant="secondary"
                height="h-11"
                text="登入／註冊會員"
                onClick={() => navigate('/member/login', { state: { returnTo: '/order/checkout' } })}
              />
              <p className="text-center type-caption text-ink-600">不登入也可以直接付款</p>
            </section>
          )}
        </div>
      </div>

      <div className="fixed right-0 bottom-0 left-0 z-10 border-t border-line bg-surface px-page pt-3 pb-6 shadow-pop">
        <SOButton
          height="h-[52px]"
          text={['前往付款', money(bill.total)]}
          disabled={!hasOrders}
          onClick={() => navigate('/order/checkout/payment')}
        />
      </div>
    </div>
  )
}
