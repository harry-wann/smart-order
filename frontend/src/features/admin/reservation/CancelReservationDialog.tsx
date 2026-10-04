import { useEffect } from 'react'
import SOButton from '@/components/SOButton'

export type Props = {
  name: string
  time: string
  tableNo?: string
  onConfirm: () => void
  onClose: () => void
}

function CancelReservationDialog({ name, time, tableNo, onConfirm, onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cancel-reservation-title"
        aria-describedby="cancel-reservation-desc"
        className="relative w-110 max-w-[calc(100%-2rem)] rounded-card border border-line bg-surface p-8 shadow-pop"
      >
        <h2 id="cancel-reservation-title" className="type-h2 text-ink-900">
          確定要取消 {name} {time} 的訂位嗎？
        </h2>
        <p id="cancel-reservation-desc" className="mt-2 type-body text-ink-600">
          通常是客人來電取消。{tableNo ? `取消後 ${tableNo} 會變回空桌，` : ''}這筆訂位無法恢復。
        </p>

        <div className="mt-6 flex gap-3">
          <div className="w-32 flex-none">
            <SOButton variant="ghost" height="h-13" text="先不要" onClick={onClose} />
          </div>
          <div className="flex-1">
            <SOButton variant="danger" height="h-13" text="確定取消" onClick={onConfirm} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CancelReservationDialog
