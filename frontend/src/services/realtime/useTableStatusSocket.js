import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { employeeToken } from '@/services/client/tokenStore'

// 櫃檯桌況與候位即時推播：訂閱 /topic/counter，狀態改變後通知呼叫頁面重抓
// 回傳 connected（true/false），畫面可以顯示「即時同步中」或「連線中斷」
// 斷線後每 5 秒自動重連
export function useTableStatusSocket(onTableStatus, onServiceCall) {
  const [connected, setConnected] = useState(false)
  const callbackRef = useRef(onTableStatus)
  const serviceCallRef = useRef(onServiceCall)
  
  useEffect(() => {
    callbackRef.current = onTableStatus
    serviceCallRef.current = onServiceCall            
  }, [onTableStatus, onServiceCall])


  useEffect(() => {
    const client = new Client({
      // 連目前網站的 /ws，由 Vite 轉給後端 8080
      brokerURL: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
      reconnectDelay: 5000,
      beforeConnect: () => {
        const token = employeeToken.get()
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {}
      },

      onConnect: () => {
        setConnected(true)
        client.subscribe('/topic/counter', (message) => {
          try {
            const data = JSON.parse(message.body)
            if (data.type === 'TABLE_STATUS' || data.type === 'WAITLIST_UPDATED') callbackRef.current(data)
              if (data.type === 'SERVICE_CALL') serviceCallRef.current?.(data)
          } catch (error) {
            console.error('桌況推播解析失敗', error)
          }
        })
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: (frame) => console.error('WebSocket STOMP 錯誤', frame.headers.message),
    })

    client.activate()
    return () => {
      client.deactivate()
    }
  }, [])

  return connected
}
