import { useAuth } from '../context/AuthContext';
import EmployeeRequests from './EmployeeRequests';
import ManagerDashboard from './ManagerDashboard';
import FleetCoordinatorDashboard from './FleetCoordinatorDashboard';
import AdminDashboard from './AdminDashboard';

export default function RequestsList() {
  const { user } = useAuth();
  if (user.role === 'employee') return <EmployeeRequests />;
  if (user.role === 'manager') return <ManagerDashboard />;
  if (user.role === 'fleet_coordinator') return <FleetCoordinatorDashboard />;
  if (user.role === 'admin') return <AdminDashboard />;
  return null;
}
