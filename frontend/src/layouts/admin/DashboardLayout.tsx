import { Outlet } from 'react-router'
import SideBar from '@/components/dashboard/SideBar'
import TopBar from '@/components/dashboard/TopBar'

function DashboardLayout() {
  return (
    <div className="flex h-screen w-full flex-row">
      <SideBar shopTitle="鼎沸鍋物"></SideBar>
      <div className="flex h-full flex-1 flex-col">
        <TopBar back="test" title="桌況總覽" tag="今天 9/13 (日)"></TopBar>
        <Outlet />
      </div>
    </div>
  )
}

export default DashboardLayout
