import { Routes, Route, Navigate } from 'react-router-dom';
import FireDetectionPage from './pages/FireDetectionPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/"           element={<FireDetectionPage />} />
      <Route path="/analytics"  element={<AnalyticsPage />} />
      <Route path="*"           element={<Navigate to="/" replace />} />
    </Routes>
  );
}
