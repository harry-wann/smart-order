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
import TableOpen from './features/admin/table/TableOpen'

function App() {
  return (
    <Routes>
      {/* 顧客端 - 點餐 / 購物車 / 訂單 流程 頁面路徑 */}
      <Route path="/order" element={<CustomerLayout />}>
        <Route index element={<Navigate to="/order/index" replace />} />
        <Route path="index" element={<OrderIndex />} />
      </Route>

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
        <Route path="order" element={<OrderPage />} />
        <Route path="payment-processing" element={<PaymentProcessing />} />
        <Route path="table_overview/:tableNo/open" element={<TableOpen />} />
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
      <Route path="/order-submitted" element={<OrderSubmitted />} />
    </Routes>
  )
}
export default App
