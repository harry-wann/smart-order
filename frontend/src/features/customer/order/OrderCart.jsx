import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import CustomerTopBar from '@/components/CustomerTopBar'
import Counter from '@/components/steper/Counter'
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
  const [counterVersion, setCounterVersion] = useState(0)
  // 從網址取得用餐場次 ID
  const { sessionId } = useParams()

  // 購物車資料
  const [cartItems, setCartItems] = useState([])
  const [currentTableNumber, setCurrentTableNumber] = useState('')
  const [locked, setLocked] = useState(false)

  // 頁面狀態
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // 購物車版本
  const [cartVersion, setCartVersion] = useState(0)

  // 保存目前最新的購物車版本
  const latestVersion = useRef(0)

  // 避免舊的 API 回應覆蓋新資料
  const requestId = useRef(0)

  // 紀錄目前資料所屬的用餐場次
  const activeSessionId = useRef(sessionId)

  // 取得最新購物車
  const loadCart = useCallback(async () => {
    if (!sessionId) return

    const currentRequest = ++requestId.current

    try {
      const data = await getCart(sessionId)

      // 如果有更新的請求，忽略舊回應
      if (currentRequest !== requestId.current) return

      // 如果已經切換用餐場次，忽略舊回應
      if (activeSessionId.current !== sessionId) return

      const newVersion = Number(data.cartVersion ?? 0)

      // 只接受相同或更新版本的資料
      if (newVersion >= latestVersion.current) {
        latestVersion.current = newVersion

        setCartVersion(newVersion)
        setCartItems(data.items ?? [])
        setLocked(Boolean(data.locked))
        setCurrentTableNumber(data.tableNumber ?? '')
      }

      setError('')
    } catch (err) {
      // 只讓目前最新請求回報錯誤
      if (
        currentRequest === requestId.current &&
        activeSessionId.current === sessionId
      ) {
        throw err
      }
    }
  }, [sessionId])

  // WebSocket 即時通知 收到通知時，重新呼叫 GET API
  const handleCartUpdate = useCallback(() => {
    loadCart().catch((err) => {
      console.error('WebSocket 更新購物車失敗：', err)
      setError(err.message)
    })
  }, [loadCart])

  // 訂閱目前客人的購物車通知
  useCartWebSocket(sessionId, handleCartUpdate)

  // 頁面首次載入
  useEffect(() => {
    let active = true

    // 切換用餐場次時重設狀態
    activeSessionId.current = sessionId
    requestId.current += 1
    latestVersion.current = 0

    setCartItems([])
    setCurrentTableNumber('')
    setLocked(false)
    setCartVersion(0)
    setError('')
    setLoading(true)

    async function initializeCart() {
      if (!sessionId) {
        setError('找不到目前的用餐場次')
        setLoading(false)
        return
      }

      try {
        await loadCart()
      } catch (err) {
        if (active) {
          setError(err.message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    initializeCart()

    return () => {
      active = false
      requestId.current += 1
    }
  }, [sessionId, loadCart])

  // 手機切回頁面時同步

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadCart().catch((err) => {
          console.error('重新取得購物車失敗：', err)
          setError(err.message)
        })
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [loadCart])

  // 修改商品數量

  const handleQuantityChange = async (item, newQuantity) => {
    if (busy || locked || !item.canEdit) return

    setBusy(true)
    setError('')

    try {
      if (newQuantity === 0) {
        // 數量變成 0，刪除商品
        await deleteCartItem(sessionId, item.id)
      } else {
        // 修改商品數量
        await updateCartQuantity(
          sessionId,
          item.id,
          newQuantity,
        )
      }

      // 修改成功後立即更新自己的畫面
      await loadCart()
    } catch (err) {
      setError(err.message)

      // 發生錯誤時重新查詢，還原畫面
      try {
        await loadCart()
      } catch (reloadError) {
        console.error('重新取得購物車失敗：', reloadError)
      }
    } finally {
      setCounterVersion((version) => version + 1)
      setBusy(false)
    }
  }

  // 刪除商品

  const handleDelete = async (item) => {
    if (busy || locked || !item.canEdit) return

    setBusy(true)
    setError('')

    try {
      await deleteCartItem(sessionId, item.id)

      // 刪除成功後立即更新畫面
      await loadCart()
    } catch (err) {
      setError(err.message)

      try {
        await loadCart()
      } catch (reloadError) {
        console.error('重新取得購物車失敗：', reloadError)
      }
    } finally {
      setBusy(false)
    }
  }

  // 送出自己的訂單

  const handleSubmit = async () => {
    if (
      busy ||
      locked ||
      loading ||
      cartItems.length === 0
    ) {
      return
    }

    setBusy(true)
    setError('')

    try {
      // 個人送單由後端依驗證身分處理
      const result = await submitOrder(sessionId)

      // 送出成功後進入訂單完成頁
      navigate(`/order/submitted/${(result.orderTicketId ?? result.id)}`)
    } catch (err) {
      setError(err.message)

      try {
        await loadCart()
      } catch (reloadError) {
        console.error('重新取得購物車失敗：', reloadError)
      }
    } finally {
      setBusy(false)
    }
  }

  // 計算個人購物車數量

  const totalQuantity = cartItems.reduce(
    (total, item) => total + Number(item.quantity),
    0,
  )

  // 計算個人購物車金額

  const totalPrice = cartItems.reduce(
    (total, item) =>
      total +
      Number(item.price) * Number(item.quantity),
    0,
  )

  // 購物車畫面

  return (
    <div className="flex h-screen w-full flex-col bg-surface-2">
      {/* 上方標題 */}
      <CustomerTopBar
        title="我的購物車"
        subTitle={
          currentTableNumber
            ? `${currentTableNumber} 桌・個人購物車`
            : '個人購物車'
        }
        showBackButton={true}
      />

      {/* 個人購物車提示 */}
      <div className="flex h-9.75 items-center gap-2 bg-info-bg px-4">
        <span className="type-caption text-info-ink">
          <SvgIconMap.OrdercartPeople />
        </span>

        <p className="type-caption text-info-ink">
          這是你的個人購物車，僅顯示自己加入的商品
        </p>
      </div>

      {/* 已結帳鎖定 */}
      {locked && (
        <div className="bg-warning-bg px-4 py-3">
          <p className="type-body-sm text-hold-ink">
            本桌已進入結帳流程或已結帳，無法繼續點餐
          </p>
        </div>
      )}

      {/* API 錯誤提示 */}
      {error && (
        <div
          role="alert"
          className="bg-red-50 px-4 py-3 text-sm text-brand-600"
        >
          {error}
        </div>
      )}

      {/* 商品列表 */}
      <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          // 載入中
          <div className="flex h-full items-center justify-center">
            <p className="type-body-sm text-ink-400">
              購物車載入中...
            </p>
          </div>
        ) : error && !cartItems.length ? (
          // 載入失敗
          <div className="flex h-full flex-col items-center justify-center">
            <p className="type-body-sm text-ink-400">
              無法取得購物車資料
            </p>

            <button
              type="button"
              onClick={() => {
                setLoading(true)
                loadCart()
                  .catch((err) => setError(err.message))
                  .finally(() => setLoading(false))
              }}
              className="mt-4 rounded-btn bg-brand-600 px-6 py-3 type-body-sm text-surface"
            >
              重新載入
            </button>
          </div>
        ) : cartItems.length === 0 ? (
          // 購物車是空的
          <div className="flex h-full flex-col items-center justify-center">
            <p className="type-body-sm text-ink-400">
              你的購物車是空的
            </p>

            {!locked && (
              <button
                type="button"
                onClick={() => navigate('/order/menu')}
                className="mt-4 rounded-btn bg-brand-600 px-6 py-3 type-body-sm text-surface"
              >
                去看看菜單
              </button>
            )}
          </div>
        ) : (
          // 購物車商品
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="rounded-btn border border-line bg-surface p-4"
              >
                {/* 商品名稱 + 價格 */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="type-body font-bold text-ink-900">
                      {item.name}
                    </h2>

                    {/* 加入商品的人 */}
                    <div className="mt-1 flex items-center gap-1">
                      <SvgIconMap.OrdercartPerson />
                      <p className="type-caption text-ink-400">
                        {item.people}
                      </p>
                    </div>
                  </div>

                  {/* 商品金額 */}
                  <p className="type-price font-bold text-brand-600">
                    NT${' '}
                    {(
                      Number(item.price) *
                      Number(item.quantity)
                    ).toLocaleString()}
                  </p>
                </div>

                {/* 商品選項 */}
                {(item.options ?? []).length > 0 && (
                  <p className="mt-1 type-body-sm text-ink-400">
                    {item.options.join(' · ')}
                  </p>
                )}

                {/* 備註 */}
                {item.note && (
                  <p className="type-body-sm text-ink-400">
                    備註：{item.note}
                  </p>
                )}

                {/* 自己的商品才能修改 */}
                {item.canEdit && !locked ? (
                  <div className="mt-4 flex items-center justify-between">
                    {/* 刪除按鈕 */}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(item)}
                      className="flex h-8 w-8 items-center justify-center disabled:opacity-50"
                      aria-label={`刪除 ${item.name}`}
                    >
                      <SvgIconMap.OrdercartGraytrash />
                    </button>

                    {/* 數量 Counter */}
                    <div
                      className={
                        busy ? 'pointer-events-none opacity-50' : ''
                      }
                    >
                      <Counter
                        key={`${item.id}-${item.quantity}-${counterVersion}`}
                        size="small"
                        initialCount={item.quantity}
                        showTrash={false}
                        onChange={(newQuantity) =>
                          handleQuantityChange(
                            item, newQuantity,
                          )
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 type-caption text-ink-400">
                    {locked ? '本桌已鎖定，無法修改' : '目前無法修改此商品'}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 底部小計與送出按鈕 */}
      {cartItems.length > 0 && (
        <footer className="h-38.25 border-t border-line bg-surface px-4 py-4">
          {/* 個人小計 */}
          <div className="flex items-center justify-between">
            <p className="type-body-sm text-ink-400">
              小計 {totalQuantity} 項
            </p>

            <p className="type-price font-bold text-brand-600">
              NT$ {totalPrice.toLocaleString()}
            </p>
          </div>

          {/* 說明 */}
          <p className="mt-1 type-caption text-ink-400">
            送出後建立個人訂單 · 服務費 10% 結帳時才算
          </p>

          {/* 送出按鈕 */}
          <div className="mt-3">
            <SOButton
              height="h-9"
              variant="danger"
              onClick={handleSubmit}
              disabled={busy || locked || loading}
              content={[
                <div
                  key="submit"
                  className="flex items-center gap-1"
                >
                  <span>
                    {locked ? '本桌已鎖定' : busy ? '處理中...' : '送出我的點餐'}
                  </span>
                </div>,
              ]}
            />
          </div>
        </footer>
      )}
    </div>
  )
}