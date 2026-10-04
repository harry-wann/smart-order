import { SvgIconMap, type SvgIconComponent } from '@/assets/SvgIconMap'

export enum ToastType {
  INFO = 'INFO',
  ERROR = 'ERROR',
  SYSTEM = 'SYSTEM',
}

const TOAST_CONFIG = {
  [ToastType.INFO]: { Icon: SvgIconMap.ToastInfo, backgroundColor: 'bg-success' },
  [ToastType.ERROR]: { Icon: SvgIconMap.ToastCheck, backgroundColor: 'bg-danger' },
  [ToastType.SYSTEM]: { Icon: SvgIconMap.ToastInfo, backgroundColor: 'bg-ink-900' },
} satisfies Record<
  ToastType,
  {
    Icon: SvgIconComponent
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
