import { Outlet } from 'react-router'

function CustomerRootLayout() {
  return (
    <div className="h-dvh w-full bg-surface-2">
      {/* transform 讓頁面內 fixed 的元素以這個外框為準，不會超出手機寬度 */}
      <div className="mx-auto h-full w-full max-w-107.5 transform-gpu overflow-hidden bg-paper">
        <div className="h-full w-full overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default CustomerRootLayout
