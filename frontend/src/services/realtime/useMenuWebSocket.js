import { useEffect } from 'react'
import { Client } from '@stomp/stompjs'
import { customerTokens, getDeviceId } from '@/services/client/tokenStore'

export default function useMenuWebSocket(sessionId, onStatus, onReconnect) {
  useEffect(() => {
    if (sessionId == null) return
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
        client.subscribe('/topic/menu', (message) => {
          try {
            const event = JSON.parse(message.body)
            if (event && ['MENU_SOLD_OUT', 'MENU_AVAILABLE', 'MENU_UNLISTED', 'MENU_LISTED'].includes(event.type)
              && ['string', 'number'].includes(typeof event.menuItemId)) {
              onStatus(event.menuItemId, event.type === 'MENU_SOLD_OUT', event.type)
            }
          } catch (error) {
            console.error('菜單通知解析失敗', error)
          }
        })
        onReconnect()
      },
      onStompError: (frame) => console.error('菜單通知連線失敗', frame.headers.message),
    })
    client.activate()
    return () => { void client.deactivate() }
  }, [sessionId, onStatus, onReconnect])
}
