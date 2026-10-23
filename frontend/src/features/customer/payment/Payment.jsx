import { useEffect, useRef, useState } from 'react'
import CustomerTopBar from '@/components/CustomerTopBar.tsx'
import InfoBox from '@/components/InfoBox.tsx'
import SOButton from '@/components/SOButton.tsx'
import { isApiError } from '@/services/client/ApiError.ts'
import { customerClient } from '@/services/client/customerClient.ts'
import { customerTokens } from '@/services/client/tokenStore.ts'
import { useBill } from '@/services/api/checkout/checkoutApi.js'
import { canSavePaymentCredentials, savePaymentCredentials } from './paymentCredentials.js'

const money = (n) => `NT$ ${Number(n ?? 0).toLocaleString()}`

function createPaymentForm(action, params) {
  if (typeof action !== 'string' || !action || !params || typeof params !== 'object') {
    throw new Error('付款資料不完整，請回到結帳明細後再試一次')
  }

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = action

  Object.entries(params).forEach(([key, value]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = key
    input.value = String(value)
    form.appendChild(input)
  })

  return form
}

export default function Payment() {
  const billQuery = useBill()
  const { data: bill, sessionToken: billSessionToken } = billQuery
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [reconfirmSession, setReconfirmSession] = useState(null)
  const [unavailableSession, setUnavailableSession] = useState(null)
  const [billRefreshFailedSession, setBillRefreshFailedSession] = useState(null)
  const attemptIdRef = useRef(0)
  const attemptLockedRef = useRef(false)
  const needsReconfirm = Boolean(billSessionToken && reconfirmSession === billSessionToken)
  const paymentUnavailable =
    bill?.onlinePaymentAvailable === false ||
    Boolean(billSessionToken && unavailableSession === billSessionToken)
  const billRefreshFailed = Boolean(billSessionToken && billRefreshFailedSession === billSessionToken)

  useEffect(() => {
    return () => {
      attemptIdRef.current += 1
      attemptLockedRef.current = false
    }
  }, [])

  async function handleEcpay() {
    if (attemptLockedRef.current || !bill || !billSessionToken || paymentUnavailable) return

    const sessionToken = customerTokens.session.get()
    if (sessionToken !== billSessionToken || billQuery.isFetching) return

    const attemptId = ++attemptIdRef.current
    // 跟 sessionToken 同一刻抓住：建立付款與之後查收據都用這一組
    const guestToken = customerTokens.guest.get()
    attemptLockedRef.current = true
    setPaying(true)
    setError('')
    setReconfirmSession(null)

    let submitted = false
    try {
      if (!guestToken) {
        setError('同桌身分已失效，請重新掃碼加入後再付款')
        return
      }
      if (!canSavePaymentCredentials(sessionToken, guestToken)) {
        setError('此分頁無法保存付款查詢資訊，付款尚未發起。請允許此分頁使用工作階段儲存空間後重試，或改至櫃檯付款。')
        return
      }

      const response = await customerClient.post(
        '/dining/payments/ecpay',
        { expectedTotal: bill.total },
        {
          customerAuth: [],
          headers: {
            'X-Session-Token': sessionToken,
            'X-Guest-Token': guestToken,
          },
        },
      )
      const { data } = response

      if (attemptIdRef.current !== attemptId || customerTokens.session.get() !== sessionToken) {
        if (attemptIdRef.current === attemptId) {
          setError('用餐場次已變更，請重新載入結帳明細後再付款')
        }
        return
      }

      const transactionNo = data?.params?.MerchantTradeNo
      if (typeof transactionNo !== 'string' || !transactionNo) {
        throw new Error('付款資料缺少交易編號，請到櫃檯確認付款狀態')
      }

      const form = createPaymentForm(data.action, data.params)
      const credentialsSaved = savePaymentCredentials(transactionNo, sessionToken, guestToken)
      if (!credentialsSaved) {
        setError(
          `無法保存這筆交易的查詢資訊，付款表單尚未送出，交易仍待確認。請修復此分頁儲存空間後重試同一筆交易；若無法確認狀態，請持交易編號 ${transactionNo} 至櫃檯查詢。`,
        )
        return
      }
      if (customerTokens.session.get() !== sessionToken || attemptIdRef.current !== attemptId) {
        setError('用餐場次已變更，請重新載入結帳明細後再付款')
        return
      }

      document.body.appendChild(form)
      form.submit()
      submitted = true
    } catch (err) {
      if (attemptIdRef.current !== attemptId) return

      if (isApiError(err, 'BILL_CHANGED')) {
        try {
          const refreshed = await billQuery.refetch({ throwOnError: true })
          if (attemptIdRef.current !== attemptId || customerTokens.session.get() !== sessionToken) return
          if (refreshed.isError || !refreshed.data) throw new Error('帳單重新載入失敗')
          setBillRefreshFailedSession(null)
          setReconfirmSession(sessionToken)
          setError('帳單金額已更新，請確認新的應付金額後再繼續付款')
        } catch {
          if (attemptIdRef.current === attemptId && customerTokens.session.get() === sessionToken) {
            setBillRefreshFailedSession(sessionToken)
            setError('帳單金額已變動，但重新載入失敗。請先重新載入帳單再付款')
          }
        }
      } else if (isApiError(err, 'ECPAY_AMOUNT_UNSUPPORTED')) {
        setError('這筆帳單金額不符合線上付款條件，請至櫃檯付款')
      } else if (isApiError(err, 'PAYMENT_UNAVAILABLE')) {
        setUnavailableSession(sessionToken)
        setError('線上付款目前無法使用，請至櫃檯付款')
      } else {
        setError(err.message ?? '建立付款失敗，請再試一次')
      }
    } finally {
      if (attemptIdRef.current === attemptId && !submitted) {
        attemptLockedRef.current = false
        setPaying(false)
      }
    }
  }

  const hasOrders = Boolean(bill?.orders?.length)
  const currentBill = Boolean(bill && billSessionToken && customerTokens.session.get() === billSessionToken)
  const buttonDisabled =
    paying ||
    billQuery.isFetching ||
    !currentBill ||
    !hasOrders ||
    paymentUnavailable ||
    billRefreshFailed

  async function reloadBill() {
    const refreshed = await billQuery.refetch()
    if (refreshed.data && !refreshed.isError && billSessionToken === customerTokens.session.get()) {
      setBillRefreshFailedSession(null)
      setReconfirmSession(billSessionToken)
      setError('帳單已重新載入，請確認新的應付金額後再繼續付款')
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

        {!billSessionToken && (
          <p className="mt-4 text-center type-body-sm text-ink-600" role="status">
            目前沒有有效的用餐場次，請重新加入桌次後查看帳單。
          </p>
        )}

        {billSessionToken && billQuery.isPending && (
          <p className="mt-4 text-center type-body-sm text-ink-600" role="status">
            帳單載入中…
          </p>
        )}

        {billQuery.isError && !bill && (
          <div className="mt-4 flex flex-col gap-3">
            <InfoBox icon="triangle" col="danger" text="F" custimtext={billQuery.error?.message ?? '帳單讀取失敗'} />
            <SOButton
              variant="secondary"
              height="h-11"
              text="重新載入帳單"
              onClick={reloadBill}
            />
          </div>
        )}

        {billRefreshFailed && bill && (
          <div className="mt-4">
            <SOButton
              variant="secondary"
              height="h-11"
              text="重新載入帳單"
              onClick={reloadBill}
            />
          </div>
        )}

        <div className="mt-section flex flex-col gap-card-gap">
          <SOButton
            height="h-[52px]"
            disabled={buttonDisabled}
            text={
              paying
                ? '前往綠界中…'
                : needsReconfirm
                  ? ['確認新金額並前往付款', money(bill?.total)]
                  : '綠界線上付款'
            }
            onClick={handleEcpay}
          />
          <p className="text-center type-body-sm text-ink-600">
            {paymentUnavailable ? '線上付款目前無法使用，請至櫃檯付款' : '要付現金，請直接到櫃檯結帳'}
          </p>
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
