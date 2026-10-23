import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { customerTokens } from '@/services/client/tokenStore'

// C-08 出餐進度要重抓的事件：廚房出餐、撤回、取消、報廢、整單出完或取消（KitchenNotificationService），
// 同桌有人送出新單（ORDER_SUBMITTED）、用餐結束（SESSION_CLOSED）。購物車本身的變動不影響這一頁
const PROGRESS_EVENTS = new Set([
  'ITEM_SERVED',
  'ITEM_UNSERVED',
  'ITEM_CANCELLED',
  'ITEM_WASTED',
  'TICKET_SERVED',
  'TICKET_CANCELLED',
  'ORDER_SUBMITTED',
  'SESSION_CLOSED',
])

// 訂閱這位客人的個人 queue，收到上面的事件就呼叫 onChange 重抓。
// 回傳真實的 WebSocket 連線狀態：'connecting'（第一次連線中）、'live'（已連上並訂閱）、'offline'（斷線，每 5 秒重連）
export function useOrderProgressSocket(onChange) {
  const [status, setStatus] = useState(() => (customerTokens.session.get() ? 'connecting' : 'offline'))
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!customerTokens.session.get()) return
    let disposed = false

    const client = new Client({
      brokerURL: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
      reconnectDelay: 5000,
      beforeConnect: () => {
        // 只帶用餐權杖：X-Guest-Token 只給 REST 驗證 owner，不放進 WebSocket（04 §3.1）
        client.connectHeaders = { 'X-Session-Token': customerTokens.session.get() ?? '' }
      },
      onConnect: () => {
        if (disposed) return
        client.subscribe('/user/queue/cart-updates', (message) => {
          try {
            const event = JSON.parse(message.body)
            if (!disposed && PROGRESS_EVENTS.has(event?.type)) onChangeRef.current()
          } catch (error) {
            console.error('出餐進度通知解析失敗', error)
          }
        })
        setStatus('live')
        // 第一次連上或重新連上都重抓一次完整資料：WebSocket 保證快，不保證不漏（斷線期間的事件收不到）
        onChangeRef.current()
      },
      onStompError: (frame) => {
        if (!disposed) setStatus('offline')
        console.error('出餐進度連線失敗', frame.headers.message)
      },
      onWebSocketError: () => {
        if (!disposed) setStatus('offline')
      },
      onWebSocketClose: () => {
        if (!disposed) setStatus('offline')
      },
    })

    client.activate()

    return () => {
      disposed = true
      void client.deactivate()
    }
  }, [])

  return status
}
