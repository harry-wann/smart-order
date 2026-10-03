import { Routes, Route, Navigate } from 'react-router'
import Components from './features/components-demo/Components'
import DS02 from './features/components-demo/DS02'
import DS03 from './features/components-demo/DS03'
import DS04 from './features/components-demo/DS04'
import DS05 from './features/components-demo/DS05'
import DS06 from './features/components-demo/DS06'
import DS07 from './features/components-demo/DS07'
import OrderSubmitted from './features/ProductDetail/ordersubmitted'
import { ToastManager } from './components/toast/ToastManager'
import DashboardLayout from './layouts/admin/DashboardLayout'
import TableOverview from './features/admin/table/TableOverview'
// import ItemDetails from './components/ItemDetails'
import KitchenOverview from './features/admin/kitchen/KitchenOverview'
import CustomerLayout from './layouts/customer/CustomerLayout'
import OrderIndex from './features/customer/order/OrderIndex'
import Entrance from './features/customer/order/entrance'
import { MemberLogin } from './features/customer/member/MemberLogin'
import Opt from './features/customer/member/opt'
import {Reservation} from './features/customer/reserve/reservation'
import {MemberCenter} from './features/customer/member/MemberCenter'
import {Guest} from './features/customer/reserve/guest'
import callMenu from './features/customer/order/callmenu'
import { Movein } from './features/customer/order/Movein'
import { Login } from './features/admin/Login'


export default function App() {
  return (
    <Routes>
      {/* 顧客端 - 點餐 / 購物車 / 訂單 流程 頁面路徑 */}
      <Route path="/order" element={<CustomerLayout />}>
        <Route index element={<Navigate to="/order/index" replace />} />
        <Route path="index" element={<MemberLogin />} />
        <Route path="opt" element={<Opt />} />
        <Route path="reserve" element={<Reservation />} />
        <Route path="membercenter" element={<MemberCenter />} />
        <Route path="guest" element={<Guest />} />
      </Route>
      <Route path="/entrance" element={<Entrance />}></Route>
      <Route path="/callmenu" element={<callMenu />} />
      <Route path="/movein" element={<Movein />} />

      {/* 顧客端 - 會員流程 頁面路徑  */}
      <Route path="/member" element={<CustomerLayout />}>
      </Route>

      {/* 顧客端 - 預約 頁面路徑 */}
      <Route path="/reserve" element={<CustomerLayout />}>
      </Route>

      {/* 店家端頁面路徑 */}
      <Route path="/admin" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/admin/table_overview" replace />} />
        <Route path="table_overview" element={<TableOverview />} />
        {/* <Route path="order" element={<OrderPage />} />
        <Route path="payment-processing" element={<PaymentProcessing />} /> */}
      </Route>
      <Route path="/login" element={<Login />} />

      
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
      <Route path="/order-submitted" element={<OrderSubmitted />} />
    </Routes>
  )
}
