import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { useRbac } from './context/RbacContext.jsx';
import Layout from './components/layout/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ChannelsPage from './pages/ChannelsPage.jsx';
import ChannelDetailPage from './pages/ChannelDetailPage.jsx';
import ImportPage from './pages/ImportPage.jsx';
import SyncPage from './pages/SyncPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import RbacConfigPage from './pages/RbacConfigPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import AIStudioPage from './pages/AIStudioPage.jsx';
import MicroUnitsPage from './pages/MicroUnitsPage.jsx';
import CredenceHomePage from './pages/CredenceHomePage.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner size="lg" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner size="lg" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

/**
 * Guard a route by its RBAC page key.
 * If the user's role doesn't have access, redirect to /dashboard.
 */
function RbacRoute({ pageKey, children }) {
  const { canAccessPage } = useRbac();

  if (!canAccessPage(pageKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/credence"
        element={
          <ProtectedRoute>
            <CredenceHomePage />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />}/>
        <Route path="/channels" element={<RbacRoute pageKey="channels"><ChannelsPage /></RbacRoute>} />
        <Route path="/channels/import" element={<RbacRoute pageKey="import"><ImportPage /></RbacRoute>} />
        <Route path="/channels/:id" element={<RbacRoute pageKey="channels"><ChannelDetailPage /></RbacRoute>} />
        <Route path="/micro-units" element={<RbacRoute pageKey="micro-units"><MicroUnitsPage /></RbacRoute>} />
        <Route path="/sync" element={<RbacRoute pageKey="sync"><SyncPage /></RbacRoute>} />
        <Route path="/reports" element={<RbacRoute pageKey="reports"><ReportsPage /></RbacRoute>} />
        <Route path="/ai-studio" element={<RbacRoute pageKey="ai-studio"><AIStudioPage /></RbacRoute>} />
        <Route path="/settings" element={<RbacRoute pageKey="settings"><SettingsPage /></RbacRoute>} />
        <Route path="/settings/rbac" element={<RbacConfigPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
