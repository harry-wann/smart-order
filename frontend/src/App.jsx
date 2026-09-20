import { Routes, Route } from 'react-router';
import Components from './features/Components';

export default function App() {
  return (
    <Routes>
      <Route path="/components" element={<Components />} />
    </Routes>
  );
}
