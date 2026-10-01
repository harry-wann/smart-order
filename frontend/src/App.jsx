import { Routes, Route, Navigate } from 'react-router'
import Components from './features/components-demo/Components'
import DS02 from './features/components-demo/DS02'
import DS03 from './features/components-demo/DS03'
import DS04 from './features/components-demo/DS04'
import DS05 from './features/components-demo/DS05'
import DS06 from './features/components-demo/DS06'
import DS07 from './features/components-demo/DS07'
import { ToastManager } from './components/toast/ToastManager'
import DashboardLayout from './layouts/admin/DashboardLayout'
import TableOverview from './features/admin/table/TableOverview'
import KitchenOverview from './features/admin/kitchen/KitchenOverview'

export default function App() {
  return (
    <Routes>
      {/* <Route path="/customer" element={}>

      </Route> */}

      <Route path="/admin" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/admin/table_overview" replace />} />
        <Route path="table_overview" element={<TableOverview />} />
        <Route path="kitchen" element={<KitchenOverview />} />
      </Route>

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
    </Routes>
  )
}
