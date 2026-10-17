import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'

// 櫃檯桌況即時推播：訂閱 /topic/counter，收到 TABLE_STATUS 就呼叫 onTableStatus(data)
// 回傳 connected（true/false），畫面可以顯示「即時同步中」或「連線中斷」
// 斷線後每 5 秒自動重連
export function useTableStatusSocket(onTableStatus) {
  const [connected, setConnected] = useState(false)

  // 把最新的 callback 存起來：頁面每次重畫都會產生新的函式，
  // 如果直接放進下面 useEffect 的依賴，會一直斷線重連
  const callbackRef = useRef(onTableStatus)
  useEffect(() => {
    callbackRef.current = onTableStatus
  }, [onTableStatus])

  useEffect(() => {
    const client = new Client({
      // 連目前網站的 /ws，由 Vite 轉給後端 8080
      brokerURL: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
      reconnectDelay: 5000,

      onConnect: () => {
        setConnected(true)
        client.subscribe('/topic/counter', (message) => {
          try {
            const data = JSON.parse(message.body)
            if (data.type === 'TABLE_STATUS') callbackRef.current(data)
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