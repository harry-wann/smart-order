import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import SOButton from '@/components/SOButton'
import { getOrderTicket } from '@/services/api/order/orderApi'

export default function OrderSubmitted() {
  const pageRef = useRef(null)
  const { orderTicketId } = useParams()
  const navigate = useNavigate()

  // 後端訂單資料、狀態、錯誤訊息
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 隱藏此頁外層捲動容器的側邊捲軸，保留捲動功能。
  useEffect(() => {
    const scrollContainer = pageRef.current?.parentElement
    if (!scrollContainer) return

    const className = 'order-submitted-no-scrollbar'
    const style = document.createElement('style')
    style.textContent = `.${className}::-webkit-scrollbar { display: none; }`

    scrollContainer.classList.add(className)
    scrollContainer.style.scrollbarWidth = 'none'
    document.head.appendChild(style)

    return () => {
      scrollContainer.classList.remove(className)
      scrollContainer.style.removeProperty('scrollbar-width')
      style.remove()
    }
  }, [])

  // 取得訂單
  useEffect(() => {
    let cancelled = false

    async function fetchOrder() {
      try {
        setLoading(true)
        setError('')

        const data = await getOrderTicket(orderTicketId)

        if (!cancelled) {
          setOrder(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (orderTicketId) {
      fetchOrder()
    } else {
      setError('缺少訂單編號')
      setLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [orderTicketId])

  // 狀態轉換
  const statusText = {
    PENDING: '待製作',
    PREPARING: '製作中',
    SERVED: '已出餐',
    CANCELLED: '已取消',
  }

  // 取得商品
  const orderItems = order?.items ?? []

  if (loading) {
    return <p className="p-6 text-center">訂單載入中...</p>
  }

  if (error) {
    return <p className="p-6 text-center text-brand-500">{error}</p>
  }

  if (!order) {
    return <p className="p-6 text-center">找不到訂單</p>
  }

  return (
    <div ref={pageRef} className="flex min-h-203 w-full flex-col bg-surface-2">
      {/* 上方成功內容區：375 × 659 */}
      <main className="flex min-h-164.75 flex-1 flex-col items-center px-6 pt-26.25">
        {/* 成功圖示 */}
        <div className="flex h-24 w-24 items-center justify-center rounded-pill bg-success-bg">
          <svg w-13 h-13
            viewBox="0 0 22 24"
            fill="none"
          >
            <path
              d="M7.33301 12.1834L9.89967 14.7501L14.6663 9.9834"
              stroke="#3F7A4E"
              strokeWidth="1.60417"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* 標題 */}
        <h1 className="mt-7 type-h1 font-bold text-ink-900">第  {order.sequenceNo}  單已送出</h1>

        {/* 說明文字 */}
        <div className="mt-2 text-center type-body-sm text-ink-600">
          <p>廚房已經收到，請稍候。</p>
        </div>

        {/* 這單的內容 */}
        <div className="mt-7 w-full rounded-btn border border-line bg-surface px-4 py-3 shadow-sm">

          {/* 訂單商品 */}
          {orderItems.map((item, index) => (
            <div key={item.id}>
              <div className="flex items-start gap-3 py-2">
                {/* 製作狀態 */}
                <span className="rounded-pill border border-warning-line bg-warning-bg px-2 py-1 text-[10px] text-hold-ink">
                  {statusText[item.status] ?? item.status}
                </span>

                {/* 商品資訊 */}
                <div className="min-w-0 flex-1">
                  {/* 商品名稱 數量 */}
                  <div className="flex items-center gap-1">
                    <p className="type-body font-medium text-ink-900">{item.name}</p>

                    <span className="type-body text-ink-900">× {item.quantity}</span>
                  </div>

                  {/* 商品選項 */}
                  {item.options.length > 0 && (
                    <p className="mt-1 type-caption text-ink-600">
                      {item.options.join(' · ')}
                      {item.note && ` · 備註：${item.note}`}
                    </p>
                  )}

                  {/* 沒 options，有 note */}
                  {item.options.length === 0 && item.note && (
                    <p className="mt-1 type-caption text-ink-600">{item.note}</p>
                  )}
                </div>
              </div>

              {/* 商品分隔線 */}
              {index !== orderItems.length - 1 && <div className="ml-14.5 border-b border-line" />}
            </div>
          ))}
        </div>

      </main>

      {/* 底部按鈕區：375 × 153 */}
      <footer className="flex h-38.25 shrink-0 flex-col border-t border-line bg-surface px-4 py-4">
        {/* 繼續點餐 */}
        <div className="mt-3">
          <SOButton
            variant="danger"
            height="h-13"
            onClick={() => navigate('/order/menu')}
            content={[
              <div key="param-1" className="flex items-center gap-1">
                <span>繼續點餐</span>
              </div>,
            ]}
          />
        </div>

        {/* 查看本桌訂單 */}
        <div className="mt-3">
          <SOButton
            variant="secondary"
            height="h-13"
            onClick={() => navigate('/order/history')}
            content={[
              <div key="param-1" className="flex items-center gap-1">
                <span>查看本桌訂單</span>
              </div>,
            ]}
          />
        </div>
      </footer>
    </div>
  )
}
