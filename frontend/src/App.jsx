import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import RequestsList from './pages/RequestsList';
import NewRequest from './pages/NewRequest';
import RequestDetail from './pages/RequestDetail';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Reports from './pages/Reports';

function Protected({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <Navbar />
      <div className={user ? 'container' : ''}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<Protected><RequestsList /></Protected>} />
          <Route path="/requests/new" element={<Protected roles={['employee']}><NewRequest /></Protected>} />
          <Route path="/requests/:id" element={<Protected><RequestDetail /></Protected>} />
          <Route path="/vehicles" element={<Protected roles={['manager', 'fleet_coordinator']}><Vehicles /></Protected>} />
          <Route path="/drivers" element={<Protected roles={['manager', 'fleet_coordinator']}><Drivers /></Protected>} />
          <Route path="/reports" element={<Protected roles={['manager', 'fleet_coordinator']}><Reports /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
