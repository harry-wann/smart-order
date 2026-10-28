import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { SvgIconMap } from '@/assets/SvgIconMap'
import ServiceBellCounter from '@/features/admin/table/ServiceBellCounter'

export type Props = {
  tag?: string
  childrenLeft?: ReactNode
  childrenRight?: ReactNode
}

function TopBar({ tag, childrenLeft, childrenRight }: Props) {
  const { pathname } = useLocation()
  const { back, title } = topBarConfigByPath[pathname] ?? { title: '管理後台' }

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
      <div className="flex flex-row items-center gap-2">
        {childrenRight}
        <ServiceBellCounter />
      </div>
    </header>
  )
}

export default TopBar

type TopBarConfig = {
  back?: string
  title: string
}

const topBarConfigByPath: Record<string, TopBarConfig> = {
  '/admin/table_overview': { title: '桌況總覽' },
  '/admin/kitchen': { title: '出菜看板' },
  '/admin/waitlist': { title: '候位管理' },
  '/admin/waitlist/display': { title: '候位叫號' },
  '/admin/menu': { title: '菜單管理' },
  '/admin/options': { title: '選項群組' },
  '/admin/seats': { title: '座位管理' },
}
