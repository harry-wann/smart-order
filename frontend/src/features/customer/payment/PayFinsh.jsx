import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import InfoBox from '@/components/InfoBox.tsx'
import SOButton from '@/components/SOButton.tsx'
import { SvgIconMap } from '@/assets/SvgIconMap.tsx'
import { createApiClient } from '@/services/client/createApiClient.ts'
import { customerTokens, getDeviceId } from '@/services/client/tokenStore.ts'
import { getPaymentCredentials } from './paymentCredentials.js'

const METHOD_LABELS = { ECPAY: '綠界線上付款', CASH: '現金', CARD: '信用卡' }
const MAX_TRIES = 10
const POLL_INTERVAL_MS = 2000
const receiptClient = createApiClient()

const money = (n) => `NT$ ${Number(n ?? 0).toLocaleString()}`

async function getPayment(no, signal) {
  const savedCredentials = getPaymentCredentials(no)
  const credentials =
    savedCredentials ??
    (customerTokens.session.get()
      ? { sessionToken: customerTokens.session.get(), deviceId: getDeviceId() }
      : null)

  if (!credentials?.sessionToken || !credentials?.deviceId) {
    throw new Error('找不到這筆付款的驗證資訊，請使用原付款分頁查詢，或至櫃檯確認')
  }

  const { data } = await receiptClient.get(`/payments/${encodeURIComponent(no)}`, {
    signal,
    headers: {
      'X-Session-Token': credentials.sessionToken,
      'X-Device-Id': credentials.deviceId,
    },
  })

  if (data?.transactionNo !== no) throw new Error('查詢到的交易編號不符，請至櫃檯確認')
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

function StatusPage({ title, message, action, onAction, error = false }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-page text-center">
      <h1 className="type-h2 text-ink-900">{title}</h1>
      {error ? (
        <InfoBox icon="triangle" col="danger" text="F" custimtext={message} />
      ) : (
        <p className="type-body-sm text-ink-600">{message}</p>
      )}
      {action && (
        <div className="w-full">
          <SOButton variant="secondary" height="h-11" text={action} onClick={onAction} />
        </div>
      )}
    </div>
  )
}

export default function PayFinsh() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const no = searchParams.get('no')
  const [pollGeneration, setPollGeneration] = useState(0)
  const [pollState, setPollState] = useState({
    no: null,
    result: null,
    error: '',
    timedOut: false,
    polling: false,
  })
  const state = pollState.no === no ? pollState : null
  const result = state?.result ?? null

  useEffect(() => {
    let active = true
    let timer
    let tries = 0
    const controller = new AbortController()

    const update = (patch) => {
      if (!active) return
      setPollState((current) =>
        current.no === no ? { ...current, ...patch } : { no, result: null, error: '', timedOut: false, polling: false, ...patch },
      )
    }

    setPollState({ no, result: null, error: '', timedOut: false, polling: Boolean(no) })

    if (!no || !/^[A-Za-z0-9]{1,20}$/.test(no)) {
      return () => {
        active = false
        controller.abort()
      }
    }

    async function poll() {
      tries += 1
      update({ polling: true })

      try {
        const data = await getPayment(no, controller.signal)
        if (!active) return

        if (data.status === 'PENDING') {
          const timedOut = tries >= MAX_TRIES
          update({
            result: data,
            error: '',
            timedOut,
            polling: !timedOut,
          })
          if (!timedOut) timer = setTimeout(poll, POLL_INTERVAL_MS)
          return
        }

        update({ result: data, error: '', timedOut: false, polling: false })
      } catch (err) {
        if (!active || controller.signal.aborted) return
        update({ error: err.message ?? '查詢付款結果失敗', polling: false })
      }
    }

    poll()
    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [no, pollGeneration])

  function retryQuery() {
    setPollState((current) =>
      current.no === no ? { ...current, error: '', timedOut: false, polling: true } : current,
    )
    setPollGeneration((generation) => generation + 1)
  }

  if (!no) {
    return (
      <StatusPage
        title="找不到交易編號"
        message="這個頁面沒有付款交易編號，請從付款結果連結重新開啟。"
        action="回到結帳明細"
        onAction={() => navigate('/order/checkout')}
        error
      />
    )
  }

  if (!/^[A-Za-z0-9]{1,20}$/.test(no)) {
    return (
      <StatusPage
        title="交易編號格式錯誤"
        message="無法查詢這筆付款，請確認連結或至櫃檯確認。"
        action="回到點餐首頁"
        onAction={() => navigate('/order/menu')}
        error
      />
    )
  }

  if (state?.error && !result) {
    return (
      <StatusPage
        title="查詢付款結果失敗"
        message={state.error}
        action="再查詢一次"
        onAction={retryQuery}
        error
      />
    )
  }

  if (!result) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-paper px-page text-center" role="status">
        <p className="type-h3 text-ink-900">確認付款結果中…</p>
        <p className="type-body-sm text-ink-600">請不要關閉這個頁面</p>
      </div>
    )
  }

  if (result.status === 'PENDING') {
    return (
      <div className="mx-auto flex min-h-screen w-full flex-col bg-paper px-page pt-12 pb-24 text-ink-900">
        <section className="flex flex-1 flex-col items-center text-center">
          <h1 className="type-h1 text-ink-900">
            {state?.timedOut || state?.error ? '付款仍待確認' : '確認付款結果中…'}
          </h1>
          <p className="mt-3 type-display text-brand-600 tabular-nums">{money(result.amount)}</p>
          <div className="mt-section w-full rounded-card border border-line bg-surface p-card shadow-card text-left">
            <DetailRow label="交易編號" value={result.transactionNo} />
            <DetailRow label="付款方式" value={METHOD_LABELS[result.method] ?? result.method} />
            <DetailRow label="桌號" value={`${result.tableNo}・${result.guestCount} 位`} />
          </div>
          {state?.timedOut || state?.error ? (
            <div className="mt-section w-full text-left">
              <InfoBox
                icon="triangle"
                col="warn"
                text="F"
                custimtext={
                  state.error
                    ? `${state.error}。目前仍未收到付款的最終通知，請勿重新付款。`
                    : '目前仍未收到付款的最終通知。請稍後再查詢；若已完成扣款，請持交易編號至櫃檯確認。'
                }
              />
            </div>
          ) : (
            <p className="mt-3 type-body-sm text-ink-600">請不要關閉頁面，也不要重複付款</p>
          )}
        </section>
        <div className="fixed right-0 bottom-0 left-0 z-10 border-t border-line bg-surface px-page pt-3 pb-6 shadow-pop">
          <SOButton
            variant="secondary"
            height="h-[52px]"
            text={state?.polling ? '查詢中…' : '再查詢一次'}
            disabled={state?.polling}
            onClick={retryQuery}
          />
        </div>
      </div>
    )
  }

  if (result.status === 'REQUIRES_REVIEW' || !['SUCCESS', 'FAILED'].includes(result.status)) {
    return (
      <div className="mx-auto flex min-h-screen w-full flex-col bg-paper px-page pt-12 pb-24 text-ink-900">
        <section className="flex flex-1 flex-col items-center text-center">
          <h1 className="type-h1 text-ink-900">付款待櫃檯確認</h1>
          <p className="mt-3 type-display text-brand-600 tabular-nums">{money(result.amount)}</p>
          <div className="mt-section w-full rounded-card border border-line bg-surface p-card shadow-card text-left">
            <DetailRow label="交易編號" value={result.transactionNo} />
            <DetailRow label="付款方式" value={METHOD_LABELS[result.method] ?? result.method} />
            <DetailRow label="桌號" value={`${result.tableNo}・${result.guestCount} 位`} />
          </div>
          <div className="mt-section w-full text-left">
            <InfoBox
              icon="triangle"
              col="warn"
              text="F"
              custimtext="這筆付款需要櫃檯確認。請先確認付款狀態，不要重新付款。"
            />
          </div>
        </section>
        <div className="fixed right-0 bottom-0 left-0 z-10 border-t border-line bg-surface px-page pt-3 pb-6 shadow-pop">
          <SOButton variant="secondary" height="h-[52px]" text="返回點餐首頁" onClick={() => navigate('/order/menu')} />
        </div>
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
              custimtext="付款平台已回報這筆交易失敗。若不確定款項狀態，請先到櫃檯確認，再決定是否重新付款。"
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
