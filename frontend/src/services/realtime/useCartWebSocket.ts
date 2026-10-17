import { useEffect } from 'react'
import { Client } from '@stomp/stompjs'
import { customerTokens, getDeviceId } from '@/services/client/tokenStore'

export type TableActivity = {
  eventId: string; sessionId: number; type: string; actorDeviceId: string;
  actorName: string; itemName: string; quantity: number; options: string[];
  sequenceNo: number; itemCount: number; amount: number; occurredAt: string;
}

export default function useCartWebSocket(
  sessionId: string | undefined,
  onCartUpdate: () => void,
  onActivity?: (activity: TableActivity) => void,
) {
  useEffect(() => {
    if (!sessionId) return

    const client = new Client({
      // 使用目前網站的主機建立 WebSocket 連線
      brokerURL: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,

      // 斷線後 5 秒重連
      reconnectDelay: 5000,
      beforeConnect: () => {
        client.connectHeaders = {
          'X-Session-Token': customerTokens.session.get() ?? '',
          'X-Device-Id': getDeviceId(),
        }
      },

      // 成功連線
      onConnect: () => {
        console.log('WebSocket 已連線')

        // 訂閱目前客人的購物車通知
        client.subscribe('/user/queue/cart-updates', (message) => {
          try {
            const data: unknown = JSON.parse(message.body)
            if (
              typeof data === 'object' &&
              data !== null &&
              'sessionId' in data &&
              String(data.sessionId) === String(sessionId)
            ) {
              onCartUpdate()
              if ('eventId' in data && 'actorDeviceId' in data && data.actorDeviceId !== getDeviceId()) {
                onActivity?.(data as TableActivity)
              }
            }
          } catch (error) {
            console.error('購物車通知解析失敗', error)
          }
        })
        // 重連成功後也重新取得資料，避免漏掉斷線期間的更新
        onCartUpdate()
      },

      onStompError: (frame) => {
        console.error('WebSocket STOMP 錯誤', frame.headers.message)
      },

      onWebSocketError: (error) => {
        console.error('WebSocket 連線錯誤', error)
      },
    })

    client.activate()

    return () => {
      void client.deactivate()
    }
  }, [sessionId, onCartUpdate, onActivity])
}
