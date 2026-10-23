import { useEffect } from 'react'
import { Client } from '@stomp/stompjs'
import { customerTokens, getDeviceId } from '@/services/client/tokenStore'
import { getCurrentDining } from '@/services/api/dining/diningApi'

export default function useMenuWebSocket(sessionId, onStatus, onReconnect, onSessionClosed, onSessionInvalid) {
  useEffect(() => {
    if (sessionId == null) return
    let disposed = false
    const checkSession = async () => {
      try {
        await getCurrentDining()
      } catch (error) {
        if (!disposed && error.status === 401) onSessionInvalid(error)
      }
    }
    const client = new Client({
      brokerURL: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
      reconnectDelay: 5000,
      beforeConnect: () => {
        client.connectHeaders = {
          'X-Session-Token': customerTokens.session.get() ?? '',
          'X-Device-Id': getDeviceId(),
        }
      },
      onConnect: () => {
        client.subscribe('/user/queue/cart-updates', (message) => {
          try {
            const event = JSON.parse(message.body)
            if (event?.type === 'SESSION_CLOSED' && String(event.sessionId) === String(sessionId)) {
              onSessionClosed(event)
            }
          } catch (error) {
            console.error('用餐結束通知解析失敗', error)
          }
        })
        client.subscribe('/topic/menu', (message) => {
          try {
            const event = JSON.parse(message.body)
            // 店長停用／啟用整個分類：沒有單一品項可更新，直接當成重新連線處理，整份菜單（分類＋品項）重抓
            if (event?.type === 'MENU_CATEGORY_CHANGED') {
              onReconnect()
              return
            }
            if (event && ['MENU_SOLD_OUT', 'MENU_AVAILABLE', 'MENU_UNLISTED', 'MENU_LISTED'].includes(event.type)
              && ['string', 'number'].includes(typeof event.menuItemId)) {
              onStatus(event.menuItemId, event.type === 'MENU_SOLD_OUT', event.type)
            }
          } catch (error) {
            console.error('菜單通知解析失敗', error)
          }
        })
        onReconnect()
        void checkSession()
      },
      onStompError: (frame) => console.error('菜單通知連線失敗', frame.headers.message),
      onWebSocketClose: () => { if (!disposed) void checkSession() },
    })
    client.activate()
    const onVisible = () => { if (document.visibilityState === 'visible') void checkSession() }
    window.addEventListener('online', checkSession)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      disposed = true
      window.removeEventListener('online', checkSession)
      document.removeEventListener('visibilitychange', onVisible)
      void client.deactivate()
    }
  }, [sessionId, onStatus, onReconnect, onSessionClosed, onSessionInvalid])
}
