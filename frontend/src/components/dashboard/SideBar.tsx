import SideBarSection, { type DashboardMenu } from './SideBarSection'
import { SvgIconMap } from '@/assets/SvgIconMap'

export type Props = {
  shopTitle: string
}

function SideBar({ shopTitle }: Props) {
  return (
    <div className="flex h-full w-52 shrink-0 flex-col border-r border-r-line bg-surface-2 px-3 py-4">
      <span className="px-3 type-price font-black text-ink-900">{shopTitle}</span>
      <span className="px-3 type-dashboard-subtitle text-ink-400">SMART ORDER</span>

      {menuGroups.map((menu) => (
        <SideBarSection key={menu.title} menu={menu} />
      ))}
    </div>
  )
}

export default SideBar

const menuGroups: DashboardMenu[] = [
  {
    title: '櫃檯',
    items: [
      {
        label: '桌況總覽',
        icon: SvgIconMap.DashboardTables,
        path: 'table_overview',
      },
      {
        label: '出菜看板',
        icon: SvgIconMap.DashboardKitchen,
        path: 'kitchen',
      },
      {
        label: '預約管理',
        icon: SvgIconMap.DashboardCalendar,
        path: 'reservations',
      },
      {
        label: '候位管理',
        icon: SvgIconMap.DashboardList,
        path: 'queue',
      },
    ],
  },

  {
    title: '菜單',
    items: [
      {
        label: '菜單管理',
        icon: SvgIconMap.DashboardMenu,
        path: 'menu',
      },
      {
        label: '選項群組',
        icon: SvgIconMap.DashboardOptions,
        path: 'options',
      },
      // {
      //   label: '庫存管理',
      //   icon: SvgIconMap.DashboardInventory,
      //   path: 'inventory',
      // },
    ],
  },
  {
    title: '設定',
    items: [
      {
        label: '座位管理',
        icon: SvgIconMap.DashboardSeats,
        path: 'seats',
      },
      // {
      //   label: '報表',
      //   icon: SvgIconMap.DashboardReports,
      //   path: 'reports',
      // },
    ],
  },
]
