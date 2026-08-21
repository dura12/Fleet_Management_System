import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = {
    employee: 'Employee',
    manager: 'Manager',
    fleet_coordinator: 'Fleet Coordinator',
  }[user.role];

  return (
    <div className="navbar">
      <div className="brand">OTech Fleet Management</div>
      <nav>
        <NavLink to="/" end>Requests</NavLink>
        {(user.role === 'fleet_coordinator' || user.role === 'manager') && (
          <NavLink to="/vehicles">Vehicles</NavLink>
        )}
        {(user.role === 'fleet_coordinator' || user.role === 'manager') && (
          <NavLink to="/drivers">Drivers</NavLink>
        )}
        {(user.role === 'fleet_coordinator' || user.role === 'manager') && (
          <NavLink to="/reports">Reports</NavLink>
        )}
        <span className="user-info">{user.fullName} &middot; {roleLabel}</span>
        <button className="link-btn" onClick={handleLogout}>Log out</button>
      </nav>
    </div>
  );
}
