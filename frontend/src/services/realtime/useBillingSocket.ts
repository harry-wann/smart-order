import { useEffect, useRef } from 'react'
import { Client, type StompSubscription } from '@stomp/stompjs'
import { employeeToken } from '@/services/client/tokenStore'

type BillingEvent = {
  type?: string
  sessionId?: number | string
}

export function useBillingSocket(
  sessionId: number | string | null | undefined,
  onBillingUpdate: () => void,
) {
  const callbackRef = useRef(onBillingUpdate)

  useEffect(() => {
    callbackRef.current = onBillingUpdate
  }, [onBillingUpdate])

  useEffect(() => {
    if (sessionId == null) return

    let disposed = false
    let subscription: StompSubscription | undefined
    const refresh = () => {
      if (!disposed) callbackRef.current()
    }

    const client = new Client({
      brokerURL: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
      reconnectDelay: 5000,
      beforeConnect: () => {
        const token = employeeToken.get()
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {}
      },
      onConnect: () => {
        if (disposed) return
        subscription = client.subscribe('/topic/billing', (message) => {
          try {
            const event = JSON.parse(message.body) as BillingEvent
            if (
              event.type === 'BILL_UPDATED' &&
              String(event.sessionId) === String(sessionId)
            ) {
              refresh()
            }
          } catch (error) {
            console.error('帳單通知解析失敗', error)
          }
        })
        refresh()
      },
      onStompError: (frame) => console.error('帳單通知連線失敗', frame.headers.message),
    })

    client.activate()

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    const fallbackId = window.setInterval(refresh, 30_000)

    return () => {
      disposed = true
      subscription?.unsubscribe()
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.clearInterval(fallbackId)
      void client.deactivate()
    }
  }, [sessionId])
}
