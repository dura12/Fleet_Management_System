import { useEffect } from 'react';
import { Routes, Route, Navigate, Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { RequestUiProvider, useRequestUi } from './context/RequestUiContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import RequestsList from './pages/RequestsList';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Reports from './pages/Reports';

const ROLE_LABELS = {
  employee: 'Employee',
  manager: 'Manager',
  fleet_coordinator: 'Fleet Coordinator',
  admin: 'Administrator',
};

function Protected({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div>
        <h1>Access denied</h1>
        <div className="error-banner">
          This page is only available to: {roles.map((r) => ROLE_LABELS[r] || r).join(', ')}.
          You are signed in as {ROLE_LABELS[user.role] || user.role}.
        </div>
        <Link to="/" className="btn secondary">Back to Requests</Link>
      </div>
    );
  }
  return children;
}

function OpenCreateModalRedirect() {
  const { openCreate } = useRequestUi();
  const navigate = useNavigate();
  useEffect(() => {
    openCreate();
    navigate('/', { replace: true });
  }, [openCreate, navigate]);
  return null;
}

function OpenDetailModalRedirect() {
  const { id } = useParams();
  const { openDetail } = useRequestUi();
  const navigate = useNavigate();
  useEffect(() => {
    openDetail(id);
    navigate('/', { replace: true });
  }, [id, openDetail, navigate]);
  return null;
}

function AuthenticatedApp() {
  const { user } = useAuth();
  return (
    <RequestUiProvider>
      <NotificationProvider>
        <div className="app-shell">
          <Navbar />
          <div className={user.role === 'employee' ? 'container employee-container' : user.role === 'manager' ? 'container manager-container' : user.role === 'fleet_coordinator' ? 'container coordinator-container' : user.role === 'admin' ? 'container admin-container' : 'container'}>
            <Routes>
              <Route path="/" element={<RequestsList />} />
              <Route path="/requests/new" element={<Protected roles={['employee']}><OpenCreateModalRedirect /></Protected>} />
              <Route path="/requests/:id" element={<OpenDetailModalRedirect />} />
              <Route path="/vehicles" element={<Protected roles={['admin', 'manager', 'fleet_coordinator']}><Vehicles /></Protected>} />
              <Route path="/drivers" element={<Protected roles={['admin', 'manager', 'fleet_coordinator']}><Drivers /></Protected>} />
              <Route path="/reports" element={<Protected roles={['admin', 'manager', 'fleet_coordinator']}><Reports /></Protected>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </NotificationProvider>
    </RequestUiProvider>
  );
}

export default function App() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="app-shell">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  return <AuthenticatedApp />;
}
