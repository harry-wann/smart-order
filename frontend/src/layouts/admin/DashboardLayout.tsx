import { Outlet } from 'react-router'
import SideBar from '@/components/dashboard/SideBar'

function DashboardLayout() {
  return (
    <div className="flex h-screen w-full flex-row">
      <SideBar shopTitle="鼎沸鍋物"></SideBar>
      {/* min-w-0：讓寬表格在自己的捲動區裡捲，不把整個後台撐出橫向捲軸 */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* 使用 DashboardLayout 的頁面需自行放入 <TopBar />，並加入該頁的自訂內容。 */}
        <Outlet />
      </div>
    </div>
  )
}

export default DashboardLayout
