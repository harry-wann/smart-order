import IcInfo from '@/assets/ic_toast_info.svg?react'
import IcCheck from '@/assets/ic_toast_check.svg?react'

export enum ToastType {
  INFO = 'INFO',
  ERROR = 'ERROR',
  SYSTEM = 'SYSTEM',
}

const TOAST_CONFIG = {
  [ToastType.INFO]: { Icon: IcInfo, backgroundColor: 'bg-success' },
  [ToastType.ERROR]: { Icon: IcCheck, backgroundColor: 'bg-danger' },
  [ToastType.SYSTEM]: { Icon: IcInfo, backgroundColor: 'bg-ink-900' },
} satisfies Record<
  ToastType,
  {
    Icon: React.ComponentType
    backgroundColor: string
  }
>

export type Props = {
  type: ToastType
  title: string
}

function ToastItem({ type = ToastType.INFO, title = '= ToastType.INFO' }: Props) {
  const { Icon, backgroundColor } = TOAST_CONFIG[type]

  return (
    <div
      className={`flex w-full flex-row items-center gap-1.5 rounded-btn p-4 text-surface ${backgroundColor}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="mb-0.5 min-w-0 text-base leading-5 wrap-break-word">{title}</span>
    </div>
  )
}

export default ToastItem
