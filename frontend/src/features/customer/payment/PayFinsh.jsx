import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import InfoBox from '@/components/InfoBox.tsx'
import SOButton from '@/components/SOButton.tsx'
import { SvgIconMap } from '@/assets/SvgIconMap.tsx'
import { customerClient } from '@/services/client/customerClient.ts'

const DEMO_RESULT = {
  status: 'SUCCESS',
  transactionNo: 'T1789311960417123',
  method: 'ECPAY',
  amount: 1562,
  paidAt: '2026/09/13 19:26',
  tableNo: 'A03',
  guestCount: 3,
}

const METHOD_LABELS = { ECPAY: '綠界線上付款', CASH: '現金', CARD: '信用卡' }
const MAX_TRIES = 10

const money = (n) => `NT$ ${Number(n ?? 0).toLocaleString()}`

async function getPayment(no) {
  const { data } = await customerClient.get(`/payments/${no}`, { customerAuth: [] })
  return data
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="type-body-sm text-ink-600">{label}</span>
      <span className="type-body text-ink-900 tabular-nums">{value}</span>
    </div>
  )
}

function ResultIcon({ ok }) {
  const Icon = ok ? SvgIconMap.InfoboxCheck : SvgIconMap.InfoxboxTriangle
  return (
    <div
      className={`flex size-24 items-center justify-center rounded-full ${ok ? 'bg-success-bg' : 'bg-danger-bg'}`}
    >
      <Icon aria-hidden="true" className="size-12" />
    </div>
  )
}

export default function PayFinsh() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const no = searchParams.get('no')

  const [result, setResult] = useState(no ? null : DEMO_RESULT)
  const [error, setError] = useState('')
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!no) return
    let tries = 0
    let timer

    async function poll() {
      try {
        const data = await getPayment(no)
        setResult(data)
        if (data.status === 'PENDING') {
          if (++tries < MAX_TRIES) timer = setTimeout(poll, 2000)
          else setTimedOut(true)
        }
      } catch (err) {
        setError(err.message ?? '查詢付款結果失敗')
      }
    }

    poll()
    return () => clearTimeout(timer)
  }, [no])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-page text-center">
        <InfoBox icon="triangle" col="danger" text="F" custimtext={error} />
        <div className="w-full">
          <SOButton variant="secondary" height="h-11" text="回到結帳明細" onClick={() => navigate('/order/checkout')} />
        </div>
      </div>
    )
  }

  if (!result || (result.status === 'PENDING' && !timedOut)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-paper px-page text-center" role="status">
        <p className="type-h3 text-ink-900">確認付款結果中…</p>
        <p className="type-body-sm text-ink-600">請不要關閉這個頁面</p>
      </div>
    )
  }

  const ok = result.status === 'SUCCESS'

  return (
    <div className="relative mx-auto flex min-h-screen w-full flex-col bg-paper text-ink-900">
      <div className="flex flex-1 flex-col items-center px-page pt-12 pb-24">
        <ResultIcon ok={ok} />
        <h1 className="mt-section type-h1 text-ink-900">{ok ? '付款完成' : '付款失敗'}</h1>
        <p className="mt-2 type-display text-brand-600 tabular-nums">{money(result.amount)}</p>

        <section className="mt-section w-full rounded-card border border-line bg-surface p-card shadow-card">
          <DetailRow label="交易編號" value={result.transactionNo} />
          <DetailRow label="付款方式" value={METHOD_LABELS[result.method] ?? result.method} />
          {ok && <DetailRow label="時間" value={result.paidAt} />}
          <DetailRow label="桌號" value={`${result.tableNo}・${result.guestCount} 位`} />
        </section>

        {ok ? (
          <div className="mt-section text-center">
            <p className="type-h3 text-ink-900">感謝光臨，歡迎再來</p>
            <p className="mt-1 type-body-sm text-ink-600">這桌的點餐已經結束，同桌的手機也會一起顯示已結帳</p>
          </div>
        ) : (
          <div className="mt-section w-full">
            <InfoBox
              icon="triangle"
              col="danger"
              text="F"
              custimtext={
                result.status === 'FAILED'
                  ? '這次付款沒有成功，沒有扣款，可以再付一次或到櫃檯結帳。'
                  : '沒有收到付款成功的通知。如果信用卡已經扣款，請先到櫃檯確認，不要重複付款。'
              }
            />
          </div>
        )}
      </div>

      <div className="fixed right-0 bottom-0 left-0 z-10 border-t border-line bg-surface px-page pt-3 pb-6 shadow-pop">
        {ok ? (
          <SOButton variant="secondary" height="h-[52px]" text="查看電子收據" disabled />
        ) : (
          <SOButton height="h-[52px]" text="重新付款" onClick={() => navigate('/order/checkout/payment')} />
        )}
      </div>
    </div>
  )
}
