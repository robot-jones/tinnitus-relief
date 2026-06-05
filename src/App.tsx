import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useProfile } from './contexts/ProfileContext';
import Layout from './components/Layout/Layout';
import CalibrationScreen from './screens/Calibration';
import SessionScreen from './screens/Session';
import HistoryScreen from './screens/History';
import SettingsScreen from './screens/Settings';

function RootRedirect() {
  const { settings } = useProfile();
  return <Navigate to={settings.onboardingComplete ? '/session' : '/calibration'} replace />;
}

function ThemeSync() {
  const { settings } = useProfile();
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeSync />
      <Layout>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/calibration" element={<CalibrationScreen />} />
          <Route path="/session" element={<SessionScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
