import { NavLink } from 'react-router'
import { type SvgIconComponent } from '@/assets/SvgIconMap'

export type DashboardMenu = {
  title: string
  items: DashboardMenuItem[]
}

export type DashboardMenuItem = {
  label: string
  icon: SvgIconComponent
  path: string
}

export type Props = {
  menu: DashboardMenu
}

function SideBarSection({ menu }: Props) {
  return (
    <div className="mt-4 flex flex-col gap-1">
      <span className="type-dashboard-menu-subtitle mb-1 px-3 text-ink-400">{menu.title}</span>
      {menu.items.map((item) => (
        <SideBarItem key={item.path} {...item} />
      ))}
    </div>
  )
}

export default SideBarSection

function SideBarItem({ label, icon: Icon, path }: DashboardMenuItem) {
  return (
    <NavLink
      to={`/admin/${path}`}
      className={({ isActive }) =>
        [
          'flex h-11 flex-row items-center gap-3 p-3',
          isActive ? 'rounded-[8px] bg-brand-100 text-brand-700' : 'text-ink-600',
          isActive ? 'type-dashboard-menu-highlighted' : 'type-dashboard-menu',
        ].join(' ')
      }
    >
      <Icon className="svg-icon" />
      <span>{label}</span>
    </NavLink>
  )
}
