import {useEffect, useRef, useState} from 'react'
import { Client } from '@stomp/stompjs'
import { employeeToken } from '../client/tokenStore'

// /topic/kitchen 的事件（04 §3.4）：收到任何一種就重抓看板。
// TICKET_SERVED 是單的品項全部出完（逐項勾完或整單出完），ITEM_WASTED 是報廢／退菜
const KITCHEN_EVENTS = [
  'NEW_TICKET', 'ITEM_SERVED', 'ITEM_UNSERVED', 'ITEM_CANCELLED', 'ITEM_WASTED', 'TICKET_SERVED', 'TICKET_CANCELLED',
]

// 回傳連線狀態：null＝第一次連線中、true＝已連上、false＝斷線（每 5 秒重連）
export function useKitchenSocket(onRefresh) {
  const [connected,setConnected] = useState(null)
  const refreshRef = useRef(onRefresh)

  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const client = new Client({
      brokerURL:
      `${location.protocol === 'https:' ? 'wss:' :
        'ws:'}` +
        `//${location.host}/ws`,

      reconnectDelay: 5000,
      beforeConnect: () => {
        const token = employeeToken.get()
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {}
      },
      onConnect: () => {
        setConnected(true)

        client.subscribe('/topic/kitchen',(message) => {
          try {
            const event = JSON.parse(message.body)

            if (KITCHEN_EVENTS.includes(event.type)) {
              refreshRef.current()
            }
          } catch(error) {
            console.error('廚房通知解析失敗', error)
          }
        })   
        
        refreshRef.current()
      },
      onWebSocketClose:() => setConnected(false),
      onWebSocketError: () => setConnected(false),
      onStompError:(frame) => {
        setConnected(false)
        console.error('廚房訂閱失敗',frame.headers.message)
      },
    })

    client.activate()

    return () => {
      void client.deactivate()
    }
  },[])

  return connected
}
