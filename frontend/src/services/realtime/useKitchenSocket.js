import {useEffect, useRef, useState} from 'react'
import { Client } from '@stomp/stompjs'
import { employeeToken } from '../client/tokenStore'

export function useKitchenSocket(onRefresh) {
  const [connected,setConnected] = useState(false)
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

            if(
              ['NEW_TICKET', 'ITEM_SERVED', 'ITEM_UNSERVED', 'TICKET_COMPLETED', 'TICKET_CANCELLED']
              .includes(event.type)
            ){
                refreshRef.current()
            }
          } catch(error) {
            console.error('廚房通知解析失敗', error)
          }
        })   
        
        refreshRef.current()
      },
      onWebSocketClose:() => setConnected(false),
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
