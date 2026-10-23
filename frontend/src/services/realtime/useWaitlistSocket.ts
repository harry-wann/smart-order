import { useEffect, useRef, useState } from 'react'
import { Client, type StompSubscription } from '@stomp/stompjs'
import { employeeToken } from '@/services/client/tokenStore'

export type WaitlistEvent =
  | { type: 'WAITLIST_CALLED'; payload: { ticketNo: string; partySize: number } }
  | { type: 'WAITLIST_UPDATED'; payload: { waitingCount: number } }

function parseWaitlistEvent(value: unknown): WaitlistEvent | null {
  if (typeof value !== 'object' || value === null || !('type' in value) || !('payload' in value)) {
    return null
  }

  const event = value as { type?: unknown; payload?: unknown }
  if (typeof event.payload !== 'object' || event.payload === null) return null

  if (event.type === 'WAITLIST_CALLED') {
    const payload = event.payload as { ticketNo?: unknown; partySize?: unknown }
    return typeof payload.ticketNo === 'string' && typeof payload.partySize === 'number'
      ? { type: event.type, payload: { ticketNo: payload.ticketNo, partySize: payload.partySize } }
      : null
  }

  if (event.type === 'WAITLIST_UPDATED') {
    const payload = event.payload as { waitingCount?: unknown }
    return typeof payload.waitingCount === 'number'
      ? { type: event.type, payload: { waitingCount: payload.waitingCount } }
      : null
  }

  return null
}

export function useWaitlistSocket(
  onEvent: (event: WaitlistEvent) => void,
  onReconnect?: () => void,
) {
  const [connected, setConnected] = useState(false)
  const eventRef = useRef(onEvent)
  const reconnectRef = useRef(onReconnect)

  useEffect(() => {
    eventRef.current = onEvent
    reconnectRef.current = onReconnect
  }, [onEvent, onReconnect])

  useEffect(() => {
    let disposed = false
    let subscription: StompSubscription | undefined
    const client = new Client({
      brokerURL: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
      reconnectDelay: 5000,
      beforeConnect: () => {
        const token = employeeToken.get()
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {}
      },
      onConnect: () => {
        if (disposed) return
        setConnected(true)
        subscription = client.subscribe('/topic/waitlist', (message) => {
          try {
            const event = parseWaitlistEvent(JSON.parse(message.body))
            if (!disposed && event) eventRef.current(event)
          } catch {
            // A malformed event is ignored; the API refresh on reconnect/poll remains authoritative.
          }
        })
        reconnectRef.current?.()
      },
      onStompError: () => setConnected(false),
      onWebSocketError: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    })

    client.activate()
    return () => {
      disposed = true
      subscription?.unsubscribe()
      void client.deactivate()
    }
  }, [])

  return connected
}
