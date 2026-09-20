import { useState, useEffect, useRef } from 'react'
import DropdownNotification, { type NotificationType } from './DropdownNotification'

const MAX = 3
const STEP = 76

export interface Notice {
  id: number
  type: NotificationType
  title: string
  desc: string
  onClick: () => void
}

type Item = Notice & { leaving: boolean }

export default function DropdownNotificationHost({ incoming }: { incoming: Notice | null }) {

  const [items, setItems] = useState<Item[]>([])
  const lastId = useRef<number | null>(null)

  useEffect(() => {
    if (!incoming) return
    if (incoming.id === lastId.current) return
    lastId.current = incoming.id

    setItems(prev => {
      const next: Item[] = [{ ...incoming, leaving: false }, ...prev]
      const alive = next.filter(i => !i.leaving)
      if (alive.length > MAX) {
        const evicted = alive[alive.length - 1]
        return next.map(i => i.id === evicted.id ? { ...i, leaving: true } : i)
      }
      return next
    })
  }, [incoming])

  return <>
    {items.map((item, index) =>
      <Slot
        key={item.id}
        item={item}
        index={index}
        onExpire={() => setItems(p => p.map(i => i.id === item.id ? { ...i, leaving: true } : i))}
        onDone={() => setItems(p => p.filter(i => i.id !== item.id))}
      />
    )}
  </>
}

function Slot({ item, index, onExpire, onDone }: {
  item: Item, index: number, onExpire: () => void, onDone: () => void
}) {
  const onExpireRef = useRef(onExpire)

  useEffect(() => { 
    onExpireRef.current = onExpire
   })

  useEffect(() => {
    const t = setTimeout(() => onExpireRef.current(), 3000)
    return () => clearTimeout(t)
  }, [])

  return <div
    className="
      absolute 
      inset-x-0
      top-2 
      transition-transform 
      duration-500 
      ease-notify
      motion-reduce:transition-none
    "
    style={{ transform: `translateY(${index * STEP}px)`, zIndex: 40 - index }}
  >
    <div
      onAnimationEnd={(e) => { if (e.animationName === 'notify-out') onDone() }}
      className={item.leaving ? 'animate-notify-out' : 'animate-notify-in'}
    >
      <DropdownNotification
        type={item.type}
        title={item.title}
        desc={item.desc}
        onClick={item.onClick}
      />
    </div>
  </div>
}