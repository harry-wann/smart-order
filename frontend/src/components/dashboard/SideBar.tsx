import { useNavigate } from 'react-router'
import SideBarSection, { type DashboardMenu } from './SideBarSection'
import { SvgIconMap } from '@/assets/SvgIconMap'
import { signOutEmployee } from '@/services/client/auth'
import { EMPLOYEE_LOGIN_PATH } from '@/services/client/employeeClient'

export type Props = {
  shopTitle: string
}

function SideBar({ shopTitle }: Props) {
  const navigate = useNavigate()

  // 登出：清掉這台裝置存的員工 token 和店家端快取，再回登入頁。
  // JWT 本身到期前還是有效（見 M8 問題 4），這裡做的是讓這台裝置忘掉它
  function handleLogout() {
    signOutEmployee()
    navigate(EMPLOYEE_LOGIN_PATH, { replace: true })
  }

  return (
    <div className="flex h-full w-52 shrink-0 flex-col border-r border-r-line bg-surface-2 px-3 py-4">
      <span className="px-3 type-price font-black text-ink-900">{shopTitle}</span>
      <span className="type-dashboard-menu-subtitle px-3 text-ink-400">SMART ORDER</span>

      {menuGroups.map((menu) => (
        <SideBarSection key={menu.title} menu={menu} />
      ))}

      <button
        type="button"
        className="mt-auto flex h-11 flex-row items-center gap-3 p-3 type-dashboard-menu text-ink-600"
        onClick={handleLogout}
      >
        登出
      </button>
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
        label: '預約管理',
        icon: SvgIconMap.DashboardCalendar,
        path: 'reservations',
      },
      {
        label: '候位管理',
        icon: SvgIconMap.DashboardList,
        path: 'waitlist',
      },
      {
        label: '出菜看板',
        icon: SvgIconMap.DashboardKitchen,
        path: 'kitchen',
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
