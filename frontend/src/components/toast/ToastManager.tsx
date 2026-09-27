import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import ToastItem, { type Props as ToastProps } from './ToastItem'

type ActiveToast = ToastProps & { id: number }
type ToastContextValue = { showToast: (toast: ToastProps) => void }

const ToastContext = createContext<ToastContextValue | null>(null)
const TOAST_DURATION_MS = 3000
const TRANSITION_DURATION_MS = 200

export function ToastManager({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ActiveToast | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const nextId = useRef(0)
  const lifecycle = useRef<{
    enterFrame: number | null
    hideTimer: number | null
    removeTimer: number | null
  }>({ enterFrame: null, hideTimer: null, removeTimer: null })

  const clearLifecycle = useCallback(() => {
    if (lifecycle.current.enterFrame !== null) {
      window.cancelAnimationFrame(lifecycle.current.enterFrame)
    }
    if (lifecycle.current.hideTimer !== null) {
      window.clearTimeout(lifecycle.current.hideTimer)
    }
    if (lifecycle.current.removeTimer !== null) {
      window.clearTimeout(lifecycle.current.removeTimer)
    }
    lifecycle.current = { enterFrame: null, hideTimer: null, removeTimer: null }
  }, [])

  const showToast = useCallback(
    (newToast: ToastProps) => {
      clearLifecycle()
      setIsVisible(false)
      setToast({ ...newToast, id: ++nextId.current })
    },
    [clearLifecycle],
  )

  const dismissToast = useCallback(
    (id: number) => {
      clearLifecycle()
      setIsVisible(false)
      lifecycle.current.removeTimer = window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current))
      }, TRANSITION_DURATION_MS)
    },
    [clearLifecycle],
  )

  useEffect(() => {
    if (!toast) return

    lifecycle.current.enterFrame = window.requestAnimationFrame(() => {
      lifecycle.current.enterFrame = null
      setIsVisible(true)
    })
    lifecycle.current.hideTimer = window.setTimeout(
      () => setIsVisible(false),
      TOAST_DURATION_MS - TRANSITION_DURATION_MS,
    )
    lifecycle.current.removeTimer = window.setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current))
    }, TOAST_DURATION_MS)

    return clearLifecycle
  }, [toast, clearLifecycle])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-center"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast && (
          <button
            key={toast.id}
            type="button"
            aria-label={`${toast.title}，點擊關閉通知`}
            onClick={() => dismissToast(toast.id)}
            className={`pointer-events-auto block w-full max-w-xl rounded-btn border-0 bg-transparent p-0 text-left transition-all duration-200 ease-out motion-reduce:transition-none ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
          >
            <ToastItem type={toast.type} title={toast.title} />
          </button>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastManager')
  }
  return context
}
