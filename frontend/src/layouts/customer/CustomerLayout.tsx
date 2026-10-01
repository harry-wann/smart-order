import { Outlet } from 'react-router'

function CustomerLayout() {
  return (
    <div className="flex h-screen w-full flex-row">
      <Outlet />
    </div>
  )
}

export default CustomerLayout
