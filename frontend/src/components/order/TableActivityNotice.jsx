import { useEffect, useState } from 'react'

export default function TableActivityNotice({ activity, onDismiss }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!activity) return
    const dismiss = window.setTimeout(onDismiss, 5000)
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => { window.clearTimeout(dismiss); window.clearInterval(tick) }
  }, [activity, onDismiss])
  if (!activity) return null
  const submitted = activity.type === 'ORDER_SUBMITTED'
  const minutes = Math.max(0, Math.floor((now - Date.parse(activity.occurredAt)) / 60000))
  const name = activity.actorName || '同桌客人'
  return (
    <div key={activity.eventId} role="status" aria-live="polite" className="fixed right-4 top-[calc(env(safe-area-inset-top,0px)+12px)] left-4 z-50 flex animate-[table-notice-enter_350ms_ease-out_both] items-center gap-3 rounded-(--radius-notify) border border-line bg-surface p-4 shadow-lg motion-reduce:animate-none">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${submitted ? 'bg-success-bg text-success' : 'bg-brand-100 text-brand-600'}`}>
        {submitted ? '單' : Array.from(name).at(-1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="type-body-sm font-bold">{submitted ? `第 ${activity.sequenceNo} 單已送出廚房` : `${name} 加了一樣東西`}</p>
        <p className="type-caption text-ink-600">
          {submitted ? `${name} 送出 ${activity.itemCount} 項・NT$ ${Number(activity.amount).toLocaleString('zh-TW')}`
            : `${activity.itemName} × ${activity.quantity}${activity.options?.length ? `・${activity.options.join('・')}` : ''}`}
        </p>
      </div>
      <span className="shrink-0 type-caption text-ink-400">{minutes === 0 ? '剛剛' : `${minutes} 分鐘前`}</span>
    </div>
  )
}
