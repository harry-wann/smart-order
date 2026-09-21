import { Routes, Route } from 'react-router';
import Components from './features/components-demo/Components';
import DS02 from './features/components-demo/DS02';
import DS03 from './features/components-demo/DS03';
import DS04 from './features/components-demo/DS04';
import DS05 from './features/components-demo/DS05';
import DS06 from './features/components-demo/DS06';
import DS07 from './features/components-demo/DS07';



export default function App() {

  return (
    <Routes>
      <Route path="/" element={<Components />} />
      <Route path="/components/ds-02" element={<DS02 />} />
      <Route path="/components/ds-03" element={<DS03 />} />
      <Route path="/components/ds-04" element={<DS04 />} />
      <Route path="/components/ds-05" element={<DS05 />} />
      <Route path="/components/ds-06" element={<DS06 />} />
      <Route path="/components/ds-07" element={<DS07 />} />
 
    </Routes>
  );
}
