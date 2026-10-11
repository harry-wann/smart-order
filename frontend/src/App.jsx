import { Routes, Route, Navigate } from 'react-router'

// Layout
import CustomerRootLayout from './layouts/customer/CustomerRootLayout'
import CustomerLayout from './layouts/customer/CustomerLayout'
import DashboardLayout from './layouts/admin/DashboardLayout'

// 顧客端
import Entrance from './features/customer/Entrance'
import OrderIndex from './features/customer/order/OrderIndex'
import { CheckIn } from './features/customer/order/CheckIn'
import Menu from './features/customer/order/Menu'
import ItemDetail from './features/customer/order/ItemDetail'
import OrderCart from './features/customer/order/OrderCart'
import OrderSubmitted from './features/customer/order/OrderSubmitted'
import OrderHistory from './features/customer/order/OrderHistory'
import { MemberLogin } from './features/customer/member/MemberLogin'
import VerifyCode from './features/customer/member/VerifyCode'
import { Register } from './features/customer/member/Register'
import { Center } from './features/customer/member/Center'
import Reservations from './features/customer/member/Reservations'
import { Reservation } from './features/customer/reserve/Reservation'
import { Guest } from './features/customer/reserve/Guest'
import DateTime from './features/customer/reserve/DateTime'
import Done from './features/customer/reserve/Done'

// 店家端
import { Login } from './features/admin/Login'
import TableOverview from './features/admin/table/TableOverview'
import TableOpen from './features/admin/table/TableOpen'
import SeatManagement from './features/admin/table/SeatManagement'
import KitchenOverview from './features/admin/kitchen/KitchenOverview'
import WaitlistManagement from './features/admin/waitlist/WaitlistManagement'
import ReservationManagement from './features/admin/reservation/ReservationManagement'
import TableDetail from './features/admin/table/TableDetail'
import MenuOptions from './features/admin/menuOptions/MenuOptions'
import AdminMenu from './features/admin/adminMenu/AdminMenu'

// Component demo
import Components from './features/components-demo/Components'
import DS02 from './features/components-demo/DS02'
import DS03 from './features/components-demo/DS03'
import DS04 from './features/components-demo/DS04'
import DS05 from './features/components-demo/DS05'
import DS06 from './features/components-demo/DS06'
import DS07 from './features/components-demo/DS07'
import DemoIndex from './features/demo/DemoIndex'
import AxiosRestDemo from './features/demo/northwind/AxiosRestDemo'
import TanStackRestDemo from './features/demo/northwind/TanStackRestDemo'
import R2UploadDemo from './features/demo/R2UploadDemo'
import { ToastManager } from './components/toast/ToastManager'

function App() {
  return (
    <Routes>
      {/* 顧客端 - 全部包在手機寬度的 root layout 裡 */}
      <Route element={<CustomerRootLayout />}>
        {/* 顧客端 - 入口頁 */}
        <Route index element={<Entrance />} />

        {/* 顧客端 - 點餐 / 購物車 / 訂單 流程 頁面路徑 */}
        <Route path="/order" element={<CustomerLayout />}>
          <Route index element={<Navigate to="/order/index" replace />} />
          <Route path="index" element={<OrderIndex />} />
          <Route path="menu" element={<Menu />} />
          <Route path="itemdetail" element={<ItemDetail />} />
          <Route path="cart" element={<OrderCart />} />
          <Route path="submitted" element={<OrderSubmitted />} />
          <Route path="history" element={<OrderHistory />} />
        </Route>
        {/* 掃碼進入是整頁版面，不套 CustomerLayout */}
        <Route path="/order/checkin" element={<CheckIn />} />

        {/* 顧客端 - 會員流程 頁面路徑  */}
        <Route path="/member" element={<CustomerLayout />}>
          <Route index element={<Navigate to="/member/login" replace />} />
          <Route path="login" element={<MemberLogin />} />
          <Route path="verify" element={<VerifyCode />} />
          <Route path="register" element={<Register />} />
          <Route path="center" element={<Center />} />
          <Route path="reservations" element={<Reservations />} />
        </Route>

        {/* 顧客端 - 預約 頁面路徑 */}
        <Route path="/reserve" element={<CustomerLayout />}>
          <Route index element={<Reservation />} />
          <Route path="guest" element={<Guest />} />
          <Route path="datetime" element={<DateTime />} />
          <Route path="done" element={<Done />} />
          <Route path=":reservationId/done" element={<Done />} />
        </Route>
      </Route>

      {/* 店家端 - 員工登入是整頁版面，不套 DashboardLayout */}
      <Route path="/admin/login" element={<Login />} />

      {/* 店家端頁面路徑 */}
      <Route path="/admin" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/admin/table_overview" replace />} />
        <Route path="table_overview" element={<TableOverview />} />
        <Route path="table_overview/:tableNo/open" element={<TableOpen />} />
        <Route path="table/detail" element={<TableDetail />} />
        <Route path="reservations" element={<ReservationManagement />} />
        <Route path="seats" element={<SeatManagement />} />
        <Route path="kitchen" element={<KitchenOverview />} />
        <Route path="waitlist" element={<WaitlistManagement />} />
        <Route path="options" element={<MenuOptions />} />
        <Route path="menu" element={<AdminMenu />} />
      </Route>

      {/* Component demo 用 */}
      <Route path="/components" element={<Components />} />
      <Route path="/components/ds-02" element={<DS02 />} />
      <Route path="/components/ds-03" element={<DS03 />} />
      <Route path="/components/ds-04" element={<DS04 />} />
      <Route path="/components/ds-05" element={<DS05 />} />
      <Route
        path="/components/ds-06"
        element={
          <ToastManager>
            <DS06 />
          </ToastManager>
        }
      />
      <Route path="/components/ds-07" element={<DS07 />} />

      {/* API 範例 */}
      <Route path="/demo" element={<DemoIndex />} />
      <Route path="/demo/northwind/axios" element={<AxiosRestDemo />} />
      <Route path="/demo/northwind/tanstack" element={<TanStackRestDemo />} />
      <Route path="/demo/r2-upload" element={<R2UploadDemo />} />
    </Routes>
  )
}
export default App
