import { Outlet } from 'react-router'
import SideBar from '@/components/dashboard/SideBar'

function DashboardLayout() {
  return (
    <div className="flex h-screen w-full flex-row">
      <SideBar shopTitle="鼎沸鍋物"></SideBar>
      <div className="flex flex-col">
        <Outlet />
      </div>
    </div>
  )
}

export default DashboardLayout
