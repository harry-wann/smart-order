import { Outlet } from 'react-router'
import SideBar from '@/components/dashboard/SideBar'

function DashboardLayout() {
  return (
    <div className="flex h-screen w-full flex-row">
      <SideBar shopTitle="鼎沸鍋物"></SideBar>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        {/* 使用 DashboardLayout 的頁面需自行放入 <TopBar />，並加入該頁的自訂內容。 */}
        <Outlet />
      </div>
    </div>
  )
}

export default DashboardLayout
