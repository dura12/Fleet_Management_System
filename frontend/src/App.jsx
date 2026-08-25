import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import RequestsList from './pages/RequestsList';
import NewRequest from './pages/NewRequest';
import RequestDetail from './pages/RequestDetail';
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

export default function App() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <Navbar />
      <div className={user ? (user.role === 'employee' ? 'container employee-container' : user.role === 'manager' ? 'container manager-container' : user.role === 'fleet_coordinator' ? 'container coordinator-container' : user.role === 'admin' ? 'container admin-container' : 'container') : ''}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<Protected><RequestsList /></Protected>} />
          <Route path="/requests/new" element={<Protected roles={['employee']}><NewRequest /></Protected>} />
          <Route path="/requests/:id" element={<Protected><RequestDetail /></Protected>} />
          <Route path="/vehicles" element={<Protected roles={['admin', 'manager', 'fleet_coordinator']}><Vehicles /></Protected>} />
          <Route path="/drivers" element={<Protected roles={['admin', 'manager', 'fleet_coordinator']}><Drivers /></Protected>} />
          <Route path="/reports" element={<Protected roles={['admin', 'manager', 'fleet_coordinator']}><Reports /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
