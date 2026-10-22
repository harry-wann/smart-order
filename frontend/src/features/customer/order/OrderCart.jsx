import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import CustomerTopBar from '@/components/CustomerTopBar'
import { SvgIconMap } from '@/assets/SvgIconMap'
import SOButton from '@/components/SOButton'

import {
  getCart,
  updateCartQuantity,
  deleteCartItem,
  submitOrder,
} from '@/services/api/cart/cartApi'

import useCartWebSocket from '@/services/realtime/useCartWebSocket'

export default function OrderCart() {
  const navigate = useNavigate()
  const { sessionId } = useParams()

  const [cartItems, setCartItems] = useState([])
  const [currentTableNumber, setCurrentTableNumber] = useState('')
  const [locked, setLocked] = useState(false)
  const [cartVersion, setCartVersion] = useState(0)
  const [sessionEpoch, setSessionEpoch] = useState(0)

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const latestVersion = useRef(0)
  const requestId = useRef(0)
  const activeSessionId = useRef(sessionId)
  const sessionGeneration = useRef(0)
  const lifecycleGeneration = useRef(0)
  const mountedRef = useRef(false)
  const busyRef = useRef(false)

  const loadCart = useCallback(async ({ clearError = true, expectedGeneration = sessionEpoch } = {}) => {
    if (
      !sessionId ||
      !mountedRef.current ||
      !isCurrentSession(activeSessionId, sessionGeneration, sessionId, expectedGeneration)
    ) {
      return false
    }

    const currentRequest = ++requestId.current

    try {
      const data = await getCart(sessionId)
      if (
        currentRequest !== requestId.current ||
        !mountedRef.current ||
        !isCurrentSession(activeSessionId, sessionGeneration, sessionId, expectedGeneration)
      ) {
        return false
      }

      const newVersion = Number(data.cartVersion ?? 0)
      if (newVersion >= latestVersion.current) {
        latestVersion.current = newVersion
        setCartVersion(newVersion)
        setCartItems(data.items ?? [])
        setLocked(Boolean(data.locked))
        setCurrentTableNumber(data.tableNumber ?? '')
      }

      if (clearError) setError('')
      return true
    } catch (err) {
      if (
        currentRequest === requestId.current &&
        mountedRef.current &&
        isCurrentSession(activeSessionId, sessionGeneration, sessionId, expectedGeneration)
      ) {
        throw err
      }
      return false
    }
  }, [sessionId, sessionEpoch])

  useLayoutEffect(() => {
    lifecycleGeneration.current += 1
    const lifecycle = lifecycleGeneration.current
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      if (lifecycleGeneration.current === lifecycle) lifecycleGeneration.current += 1
      requestId.current += 1
      busyRef.current = false
    }
  }, [])

  const handleCartUpdate = useCallback(() => {
    loadCart({ expectedGeneration: sessionEpoch }).catch((err) => {
      if (
        !mountedRef.current ||
        !isCurrentSession(activeSessionId, sessionGeneration, sessionId, sessionEpoch)
      ) {
        return
      }
      console.error('WebSocket 更新購物車失敗：', err)
      setError(getCartErrorMessage(err))
    })
  }, [loadCart, sessionEpoch, sessionId])

  useCartWebSocket(sessionId, handleCartUpdate)

  useLayoutEffect(() => {
    if (activeSessionId.current === sessionId) return

    activeSessionId.current = sessionId
    sessionGeneration.current += 1
    const nextEpoch = sessionGeneration.current
    setSessionEpoch(nextEpoch)

    requestId.current += 1
    latestVersion.current = 0
    busyRef.current = false

    setCartItems([])
    setCurrentTableNumber('')
    setLocked(false)
    setCartVersion(0)
    setError('')
    setBusy(false)
    setLoading(true)
  }, [sessionId])

  useEffect(() => {
    let active = true
    const expectedGeneration = sessionEpoch

    async function initializeCart() {
      if (!sessionId) {
        if (isCurrentSession(activeSessionId, sessionGeneration, sessionId, expectedGeneration)) {
          setError('找不到目前的用餐場次')
          setLoading(false)
        }
        return
      }

      try {
        await loadCart({ expectedGeneration })
      } catch (err) {
        if (
          active &&
          mountedRef.current &&
          isCurrentSession(activeSessionId, sessionGeneration, sessionId, expectedGeneration)
        ) {
          setError(getCartErrorMessage(err))
        }
      } finally {
        if (
          active &&
          mountedRef.current &&
          isCurrentSession(activeSessionId, sessionGeneration, sessionId, expectedGeneration)
        ) {
          setLoading(false)
        }
      }
    }

    initializeCart()

    return () => {
      active = false
      if (
        isCurrentSession(activeSessionId, sessionGeneration, sessionId, expectedGeneration)
      ) {
        requestId.current += 1
      }
    }
  }, [sessionId, sessionEpoch, loadCart])

  useEffect(() => {
    const expectedGeneration = sessionEpoch
    const handleVisibilityChange = () => {
      if (document.hidden) return

      loadCart({ expectedGeneration }).catch((err) => {
        if (
          !mountedRef.current ||
          !isCurrentSession(activeSessionId, sessionGeneration, sessionId, expectedGeneration)
        ) {
          return
        }
        console.error('重新取得購物車失敗：', err)
        setError(getCartErrorMessage(err))
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [loadCart, sessionEpoch, sessionId])

  const beginBusyAction = () => {
    if (
      busyRef.current ||
      !mountedRef.current ||
      !isCurrentSession(activeSessionId, sessionGeneration, sessionId, sessionEpoch)
    ) {
      return null
    }
    busyRef.current = true
    setBusy(true)
    setError('')
    return {
      sessionId,
      generation: sessionEpoch,
      lifecycle: lifecycleGeneration.current,
    }
  }

  const isCurrentAction = (action) => Boolean(
    action &&
    mountedRef.current &&
    action.lifecycle === lifecycleGeneration.current &&
    isCurrentSession(
      activeSessionId,
      sessionGeneration,
      action.sessionId,
      action.generation,
    ),
  )

  const finishBusyAction = (action) => {
    if (!isCurrentAction(action)) return
    busyRef.current = false
    setBusy(false)
  }

  const reloadAfterActionError = async (message, action) => {
    if (!isCurrentAction(action)) return
    setError(message)
    try {
      await loadCart({ clearError: false, expectedGeneration: action.generation })
    } catch (reloadError) {
      if (!isCurrentAction(action)) return
      console.error('重新取得購物車失敗：', reloadError)
    }
  }

  const handleQuantityChange = async (item, newQuantity) => {
    if (locked || !isOwnCartItem(item)) return
    const action = beginBusyAction()
    if (!action) return

    try {
      if (newQuantity === 0) {
        await deleteCartItem(action.sessionId, item.id)
      } else {
        await updateCartQuantity(action.sessionId, item.id, newQuantity)
      }
      if (!isCurrentAction(action)) return
      await loadCart({ expectedGeneration: action.generation })
    } catch (err) {
      if (!isCurrentAction(action)) return
      await reloadAfterActionError(getCartErrorMessage(err), action)
    } finally {
      finishBusyAction(action)
    }
  }

  const handleDelete = async (item) => {
    if (locked || !isOwnCartItem(item)) return
    const action = beginBusyAction()
    if (!action) return

    try {
      await deleteCartItem(action.sessionId, item.id)
      if (!isCurrentAction(action)) return
      await loadCart({ expectedGeneration: action.generation })
    } catch (err) {
      if (!isCurrentAction(action)) return
      await reloadAfterActionError(getCartErrorMessage(err), action)
    } finally {
      finishBusyAction(action)
    }
  }

  const retryCart = async () => {
    const expectedGeneration = sessionEpoch
    if (
      !sessionId ||
      !mountedRef.current ||
      busyRef.current ||
      loading ||
      !isCurrentSession(activeSessionId, sessionGeneration, sessionId, expectedGeneration)
    ) {
      return
    }
    setLoading(true)
    try {
      await loadCart({ expectedGeneration })
    } catch (err) {
      if (
        !mountedRef.current ||
        !isCurrentSession(activeSessionId, sessionGeneration, sessionId, expectedGeneration)
      ) {
        return
      }
      setError(getCartErrorMessage(err))
    } finally {
      if (
        mountedRef.current &&
        isCurrentSession(activeSessionId, sessionGeneration, sessionId, expectedGeneration)
      ) {
        setLoading(false)
      }
    }
  }

  const handleSubmit = async () => {
    const myItems = cartItems.filter(isOwnCartItem)
    if (locked || loading || myItems.length === 0) return
    const action = beginBusyAction()
    if (!action) return

    try {
      const result = await submitOrder(action.sessionId)
      if (!isCurrentAction(action)) return
      navigate(`/order/submitted/${(result.orderTicketId ?? result.id)}`)
    } catch (err) {
      if (!isCurrentAction(action)) return
      await reloadAfterActionError(getCartErrorMessage(err), action)
    } finally {
      finishBusyAction(action)
    }
  }

  const myItems = cartItems.filter(isOwnCartItem)
  const tableItems = cartItems.filter((item) => !isOwnCartItem(item))
  const myQuantity = totalQuantity(myItems)
  const tableQuantity = totalQuantity(tableItems)
  const mySubtotal = totalPrice(myItems)
  const submitDisabled = busy || locked || loading || myItems.length === 0

  return (
    <div
      className="flex h-[100dvh] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-surface-2"
      data-cart-version={cartVersion}
    >
      <CustomerTopBar
        title="本桌購物車"
        subTitle={
          currentTableNumber
            ? `${currentTableNumber} 桌・各自送出自己的餐點`
            : '各自送出自己的餐點'
        }
        showBackButton={true}
      />

      <div className="flex shrink-0 items-start gap-2 border-b border-info-line bg-info-bg px-4 py-3">
        <SvgIconMap.OrdercartPeople className="mt-0.5 h-5 w-5 shrink-0 text-info-ink" aria-hidden="true" />
        <p className="type-caption min-w-0 break-words text-info-ink">
          可查看全桌餐點；每位客人只能修改並送出自己加入的餐點。
        </p>
      </div>

      {locked && (
        <div role="status" className="shrink-0 bg-warning-bg px-4 py-3">
          <p className="type-body-sm text-hold-ink">
            本桌已進入結帳流程或已結帳，無法繼續點餐。
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="flex shrink-0 items-center justify-between gap-3 bg-danger-bg px-4 py-3 text-sm text-danger-ink">
          <p className="min-w-0 break-words">{error}</p>
          <button
            type="button"
            onClick={retryCart}
            disabled={loading || busy}
            className="min-h-11 shrink-0 rounded-btn px-3 font-semibold underline disabled:opacity-50"
          >
            重試
          </button>
        </div>
      )}

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
        {loading ? (
          <div role="status" className="flex h-full min-h-48 items-center justify-center">
            <p className="type-body-sm text-ink-600">購物車載入中…</p>
          </div>
        ) : error && cartItems.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-line bg-surface px-5 py-8 text-center">
            <p className="type-h3 text-ink-900">暫時無法取得購物車</p>
            <p className="mt-2 type-body-sm text-ink-600">請確認網路連線後重新載入。</p>
            <button
              type="button"
              onClick={retryCart}
              disabled={loading || busy}
              className="mt-5 min-h-11 rounded-btn bg-brand-600 px-6 py-3 font-medium text-surface disabled:opacity-50"
            >
              重新載入
            </button>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-4 pb-2">
            <section
              aria-labelledby="cart-my-items-title"
              className="min-w-0 rounded-3xl border border-brand-600/20 bg-surface p-4 shadow-card"
            >
              <SectionHeading
                id="cart-my-items-title"
                title="我的餐點"
                summary={`${myItems.length} 道・${myQuantity} 份`}
                description="只有你能修改這些餐點；送出時只會建立你的訂單。"
                accent
              />

              {myItems.length > 0 ? (
                <div className="mt-4 flex min-w-0 flex-col gap-3">
                  {myItems.map((item) => (
                    <CartItemCard
                      key={item.id}
                      item={item}
                      busy={busy}
                      locked={locked}
                      onDelete={handleDelete}
                      onQuantityChange={handleQuantityChange}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-surface-2 px-4 py-5">
                  <p className="type-body-sm font-semibold text-ink-900">還沒有自己的餐點</p>
                  <p className="mt-1 type-caption text-ink-600">
                    同桌餐點不會一起送出，挑選想吃的餐點後再送出即可。
                  </p>
                </div>
              )}
            </section>

            <section
              aria-labelledby="cart-table-items-title"
              className="min-w-0 rounded-3xl border border-line bg-surface p-4 shadow-card"
            >
              <SectionHeading
                id="cart-table-items-title"
                title="同桌餐點"
                summary={`${tableItems.length} 道・${tableQuantity} 份`}
                description="其他客人加入的餐點只供查看，不會列入你的訂單或小計。"
              />

              {tableItems.length > 0 ? (
                <div className="mt-4 flex min-w-0 flex-col gap-3">
                  {tableItems.map((item) => (
                    <CartItemCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-4 type-caption text-ink-600">
                  目前沒有其他客人的餐點。
                </p>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="z-10 shrink-0 border-t border-line bg-surface px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-card">
        <div className="mx-auto w-full max-w-xl">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="type-body-sm text-ink-600">我的小計</p>
              <p className="mt-0.5 type-caption text-ink-600">{myQuantity} 份・不含服務費</p>
            </div>
            <p className="shrink-0 text-xl font-bold text-brand-600">
              NT$ {mySubtotal.toLocaleString('zh-TW')}
            </p>
          </div>

          {myItems.length === 0 && !loading && !locked && (
            <button
              type="button"
              onClick={() => navigate('/order/menu')}
              className="mt-3 min-h-11 w-full rounded-btn bg-surface-2 px-4 py-2 text-center type-body-sm font-semibold text-brand-600"
            >
              還沒點餐？前往菜單加點
            </button>
          )}

          <div className="mt-3">
            <SOButton
              height="min-h-12 py-3"
              variant="default"
              onClick={handleSubmit}
              disabled={submitDisabled}
              aria-label="送出我的餐點"
              content={[
                <span key="submit-label" className="px-2 text-center">
                  {locked
                    ? '本桌已鎖定'
                    : busy
                      ? '處理中…'
                      : myItems.length === 0
                        ? '先加點再送出'
                        : '送出我的餐點'}
                </span>,
              ]}
            />
          </div>
        </div>
      </footer>
    </div>
  )
}

function SectionHeading({ id, title, summary, description, accent = false }) {
  return (
    <header className="min-w-0">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h2 id={id} className="type-h3 min-w-0 break-words text-ink-900">{title}</h2>
        <span className={`shrink-0 rounded-full px-3 py-1 type-caption font-semibold ${accent ? 'bg-brand-100 text-brand-700' : 'bg-surface-2 text-ink-600'}`}>
          {summary}
        </span>
      </div>
      <p className="mt-1 type-caption break-words text-ink-600">{description}</p>
    </header>
  )
}

function CartItemCard({ item, busy = false, locked = false, onDelete, onQuantityChange }) {
  const editable = Boolean(isOwnCartItem(item) && !locked && onQuantityChange)
  const quantity = Number(item.quantity) || 0
  const unitPrice = Number(item.price) || 0
  const lineTotal = unitPrice * quantity
  const options = Array.isArray(item.options) ? item.options : []

  return (
    <article className="min-w-0 rounded-2xl border border-line bg-surface p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="type-body break-words font-bold text-ink-900">{item.name}</h3>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-ink-600">
            <SvgIconMap.OrdercartPerson className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="type-caption min-w-0 break-words">{item.people || '同桌客人加入'}</p>
          </div>
        </div>
        <p className="shrink-0 text-right type-price font-bold text-brand-600">
          NT$ {lineTotal.toLocaleString('zh-TW')}
        </p>
      </div>

      {options.length > 0 && (
        <p className="mt-2 break-words type-body-sm leading-relaxed text-ink-600">
          {options.join(' · ')}
        </p>
      )}
      {item.note && (
        <p className="mt-1 break-words type-caption leading-relaxed text-ink-600">
          備註：{item.note}
        </p>
      )}
      <p className="mt-2 type-caption text-ink-600">
        單價 NT$ {unitPrice.toLocaleString('zh-TW')}・{quantity} 份
      </p>

      <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        {editable ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDelete(item)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-danger-ink disabled:opacity-50"
              aria-label={`刪除 ${item.name}`}
            >
              <SvgIconMap.OrdercartGraytrash aria-hidden="true" />
            </button>
            <div className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface px-1">
              <button
                type="button"
                disabled={busy || quantity <= 1}
                onClick={() => onQuantityChange(item, quantity - 1)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-lg font-medium text-ink-600 disabled:opacity-35"
                aria-label={`減少 ${item.name} 數量`}
              >
                −
              </button>
              <span className="min-w-7 text-center font-semibold text-ink-900" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                disabled={busy || quantity >= 10}
                onClick={() => onQuantityChange(item, quantity + 1)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-lg font-medium text-ink-600 disabled:opacity-35"
                aria-label={`增加 ${item.name} 數量`}
              >
                +
              </button>
            </div>
          </>
        ) : (
          <p className="type-caption text-ink-600">
            {locked && isOwnCartItem(item)
              ? `數量 ${quantity}・本桌已鎖定`
              : `數量 ${quantity}・唯讀`}
          </p>
        )}
      </div>
    </article>
  )
}

function isOwnCartItem(item) {
  return Boolean(item?.isOwnItem ?? item?.canEdit)
}

function totalQuantity(items) {
  return items.reduce((total, item) => total + (Number(item.quantity) || 0), 0)
}

function totalPrice(items) {
  return items.reduce(
    (total, item) => total + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0,
  )
}

function getCartErrorMessage(error) {
  if (error?.code === 'CART_EMPTY') return '你的餐點已送出或已更新，請重新查看購物車。'
  return error?.message || '購物車操作失敗，請稍後重試。'
}

function isCurrentSession(activeSessionId, sessionGeneration, expectedSessionId, expectedGeneration) {
  return activeSessionId.current === expectedSessionId && sessionGeneration.current === expectedGeneration
}
