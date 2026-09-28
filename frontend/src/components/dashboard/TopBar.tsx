import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { SvgIconMap } from '@/assets/SvgIconMap'

export type Props = {
  back?: string
  title: string
  tag?: string
  childrenLeft?: ReactNode
  childrenRight?: ReactNode
}

function TopBar({ back, title, tag, childrenLeft, childrenRight }: Props) {
  return (
    <header className="flex h-15 w-full shrink-0 flex-row items-center justify-between border-b border-line bg-surface px-6 py-3">
      <div className="flex flex-row items-center gap-4">
        {back && (
          <Link to={back}>
            <SvgIconMap.DashboardBack />
          </Link>
        )}
        <span className="type-h2 text-ink-900">{title}</span>
        {tag && (
          <div className="flex items-center rounded-pill border border-line bg-surface-2 px-2 py-1">
            <span className="type-dashboard-top-bar-tag text-ink-600">{tag}</span>
          </div>
        )}
        <div className="flex flex-row items-center gap-2">{childrenLeft}</div>
      </div>
      <div className="flex flex-row items-center gap-2">{childrenRight}</div>
    </header>
  )
}

export default TopBar
