import { useState } from 'react'
import CustomerTopBar from '@/components/CustomerTopBar.tsx'
import InfoBox from '@/components/InfoBox.tsx'
import SOButton from '@/components/SOButton.tsx'
import { customerClient } from '@/services/client/customerClient.ts'
import { useBill } from '@/services/api/checkout/checkoutApi.js'

const money = (n) => `NT$ ${Number(n ?? 0).toLocaleString()}`

function submitForm(action, params) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = action

  Object.entries(params).forEach(([key, value]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = key
    input.value = value
    form.appendChild(input)
  })

  document.body.appendChild(form)
  form.submit()
}

export default function Payment() {
  const { data: bill } = useBill()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  async function handleEcpay() {
    if (paying) return
    setPaying(true)
    setError('')
    try {
      const { data } = await customerClient.post('/dining/payments/ecpay')
      submitForm(data.action, data.params)
    } catch (err) {
      setError(err.message ?? '建立付款失敗，請再試一次')
      setPaying(false)
    }
  }

  return (
    <div className="relative mx-auto flex min-h-screen w-full flex-col bg-paper text-ink-900">
      <div className="sticky top-0 z-10">
        <CustomerTopBar title="選擇付款方式" showBackButton />
      </div>

      <div className="flex-1 px-page pt-section pb-24">
        <section className="flex flex-col items-center gap-1 text-center">
          <p className="type-body-sm text-ink-600">{bill?.tableNo ?? '—'} 桌 應付金額</p>
          <p className="type-display text-brand-600 tabular-nums">{bill ? money(bill.total) : '—'}</p>
          <p className="type-caption text-ink-600">含服務費 {bill ? money(bill.serviceFee) : '—'}</p>
        </section>

        <div className="mt-section flex flex-col gap-card-gap">
          <SOButton
            height="h-[52px]"
            disabled={paying || !bill || bill.orders.length === 0}
            text={paying ? '前往綠界中…' : '綠界線上付款'}
            onClick={handleEcpay}
          />
          <p className="text-center type-body-sm text-ink-600">要付現金，請直接到櫃檯結帳</p>
        </div>

        {error && (
          <div className="mt-4">
            <InfoBox icon="triangle" col="danger" text="F" custimtext={error} />
          </div>
        )}

        <div className="mt-section">
          <InfoBox
            icon="circle"
            col="warn"
            text="F"
            custimtext="本系統是教學專題，付款使用綠界測試環境，不會產生實際交易，也不會扣款。"
          />
        </div>
      </div>

      <div className="fixed right-0 bottom-0 left-0 z-10 border-t border-line bg-surface px-page py-4 text-center">
        <p className="type-caption text-ink-600">按下後請勿重複點擊，處理約 2 秒</p>
      </div>
    </div>
  )
}
