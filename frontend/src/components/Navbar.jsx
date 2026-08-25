import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

const ROLE_LABELS = {
  employee: 'Employee',
  manager: 'Approving Manager',
  fleet_coordinator: 'Fleet Manager',
  admin: 'Administrator',
};

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function OtechTopBar() {
  return (
    <div className="otech-top-bar">
      <span className="otech-top-bar-title">OTech Engineering</span>
      <span className="otech-top-bar-meta">Fleet Management System</span>
    </div>
  );
}

function UserIdentity({ user, roleLabel }) {
  return (
    <div className="nav-user-identity" title={`${user.fullName} · ${roleLabel}`}>
      <div className="avatar">{initials(user.fullName)}</div>
      <div className="nav-user-text">
        <span className="nav-user-name">{user.fullName}</span>
        <span className="nav-user-role">{roleLabel}</span>
      </div>
    </div>
  );
}

function EmployeeNavbar({ user, roleLabel, onLogout }) {
  const [navSearch, setNavSearch] = useState('');

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('employee-nav-search', { detail: navSearch }));
  }, [navSearch]);

  return (
    <>
      <OtechTopBar />
      <header className="navbar employee-navbar">
        <div className="navbar-left">
          <BrandLogo subtitle="Fleet Management" />
        </div>
        <div className="navbar-center">
          <div className="navbar-search">
            <span className="search-icon" aria-hidden>⌕</span>
            <input
              type="search"
              placeholder="Search..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              aria-label="Search requests"
            />
          </div>
        </div>
        <div className="navbar-right">
          <button type="button" className="icon-btn" title="Notifications" aria-label="Notifications">🔔</button>
          <button type="button" className="icon-btn" title="History" aria-label="History">🕐</button>
          <a href="#" className="help-link" onClick={(e) => e.preventDefault()}>Help</a>
          <UserIdentity user={user} roleLabel={roleLabel} />
          <button type="button" className="link-btn logout-compact" onClick={onLogout}>Log out</button>
        </div>
      </header>
    </>
  );
}

function CoordinatorNavbar({ user, roleLabel, onLogout }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onCount = (e) => setPendingCount(e.detail || 0);
    window.addEventListener('coordinator-pending-count', onCount);
    return () => window.removeEventListener('coordinator-pending-count', onCount);
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setNavOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isActive = (path) =>
    location.pathname === path || (path === '/' && location.pathname === '/');

  const links = [
    { to: '/', label: 'Home' },
    { to: '/vehicles', label: 'Vehicles' },
    { to: '/drivers', label: 'Drivers' },
    { to: '/reports', label: 'Reports', badge: pendingCount },
  ];

  return (
    <>
      <OtechTopBar />
      <header className={`navbar coordinator-navbar${navOpen ? ' coordinator-nav-open' : ''}`}>
        <div className="coordinator-navbar-row">
          <div className="navbar-left">
            <BrandLogo subtitle="Fleet Management" />
          </div>
          <nav className="coordinator-nav-links" aria-label="Main navigation">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`coordinator-nav-link${isActive(l.to) ? ' active' : ''}`}
              >
                {l.label}{l.badge > 0 ? ` (${l.badge})` : ''}
              </Link>
            ))}
          </nav>
          <div className="navbar-right">
            <button
              type="button"
              className="nav-toggle coordinator-nav-toggle"
              aria-expanded={navOpen}
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setNavOpen((o) => !o)}
            >
              {navOpen ? '✕' : '☰'}
            </button>
            <button type="button" className="icon-btn coordinator-desktop-only" title="Search" aria-label="Search">⌕</button>
            <button type="button" className="icon-btn" title="Notifications" aria-label="Notifications">🔔</button>
            <a href="#" className="help-link coordinator-desktop-only" onClick={(e) => e.preventDefault()}>Help</a>
            <UserIdentity user={user} roleLabel={roleLabel} />
            <button type="button" className="link-btn logout-compact" onClick={onLogout}>Log out</button>
          </div>
        </div>
        <nav className={`coordinator-mobile-nav${navOpen ? ' is-open' : ''}`} aria-label="Mobile navigation">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`coordinator-nav-link${isActive(l.to) ? ' active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              {l.label}{l.badge > 0 ? ` (${l.badge})` : ''}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}

function AdminNavbar({ user, roleLabel, onLogout }) {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setNavOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isActive = (path) =>
    location.pathname === path || (path === '/' && location.pathname === '/');

  const links = [
    { to: '/', label: 'Home' },
    { to: '/vehicles', label: 'Vehicles' },
    { to: '/drivers', label: 'Drivers' },
    { to: '/reports', label: 'Reports' },
  ];

  return (
    <>
      <OtechTopBar />
      <header className={`navbar admin-navbar${navOpen ? ' admin-nav-open' : ''}`}>
        <div className="admin-navbar-row">
          <div className="navbar-left">
            <BrandLogo subtitle="Fleet Management" />
          </div>
          <nav className="admin-nav-links" aria-label="Main navigation">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`admin-nav-link${isActive(l.to) ? ' active' : ''}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="navbar-right">
            <button
              type="button"
              className="nav-toggle admin-nav-toggle"
              aria-expanded={navOpen}
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setNavOpen((o) => !o)}
            >
              {navOpen ? '✕' : '☰'}
            </button>
            <UserIdentity user={user} roleLabel={roleLabel} />
            <button type="button" className="link-btn logout-compact" onClick={onLogout}>Log out</button>
          </div>
        </div>
        <nav className={`admin-mobile-nav${navOpen ? ' is-open' : ''}`} aria-label="Mobile navigation">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`admin-nav-link${isActive(l.to) ? ' active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}

function ManagerNavbar({ user, roleLabel, onLogout }) {
  return (
    <>
      <OtechTopBar />
      <header className="navbar manager-navbar">
        <div className="navbar-left">
          <BrandLogo subtitle="Fleet Management" />
        </div>
        <div className="navbar-right">
          <button type="button" className="icon-btn" title="Notifications" aria-label="Notifications">🔔</button>
          <UserIdentity user={user} roleLabel={roleLabel} />
          <button type="button" className="link-btn logout-compact" onClick={onLogout}>Log out</button>
        </div>
      </header>
    </>
  );
}

function StaffNavbar({ user, roleLabel, awaitingAssignment, onLogout }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <>
      <OtechTopBar />
      <div className="navbar staff-navbar">
        <BrandLogo subtitle="Fleet Management" />
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={navOpen}
          aria-label="Open menu"
          onClick={() => setNavOpen((o) => !o)}
        >
          ☰
        </button>
        <nav className={`mobile-nav-panel${navOpen ? ' open' : ''}`}>
          <NavLink to="/" end onClick={() => setNavOpen(false)}>Home</NavLink>
          {(user.role === 'fleet_coordinator' || user.role === 'manager') && (
            <NavLink to="/vehicles" onClick={() => setNavOpen(false)}>Vehicles</NavLink>
          )}
          {(user.role === 'fleet_coordinator' || user.role === 'manager') && (
            <NavLink to="/drivers" onClick={() => setNavOpen(false)}>Drivers</NavLink>
          )}
          {(user.role === 'fleet_coordinator' || user.role === 'manager') && (
            <NavLink to="/reports" onClick={() => setNavOpen(false)}>
              Reports{user.role === 'fleet_coordinator' && awaitingAssignment > 0 ? ` (${awaitingAssignment})` : ''}
            </NavLink>
          )}
          <span className="user-info">{user.fullName} &middot; {roleLabel}</span>
          <button type="button" className="link-btn logout-compact" onClick={onLogout}>Log out</button>
        </nav>
        <nav className="staff-desktop-nav">
          <NavLink to="/" end>Home</NavLink>
          {(user.role === 'fleet_coordinator' || user.role === 'manager') && (
            <NavLink to="/vehicles">Vehicles</NavLink>
          )}
          {(user.role === 'fleet_coordinator' || user.role === 'manager') && (
            <NavLink to="/drivers">Drivers</NavLink>
          )}
          {(user.role === 'fleet_coordinator' || user.role === 'manager') && (
            <NavLink to="/reports">
              Reports{user.role === 'fleet_coordinator' && awaitingAssignment > 0 ? ` (${awaitingAssignment})` : ''}
            </NavLink>
          )}
          <UserIdentity user={user} roleLabel={roleLabel} />
          <button className="link-btn" onClick={onLogout}>Log out</button>
        </nav>
      </div>
    </>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [awaitingAssignment, setAwaitingAssignment] = useState(0);

  useEffect(() => {
    if (user?.role === 'fleet_coordinator') {
      api.getRequestStats().then((s) => setAwaitingAssignment(s.awaitingAssignment || 0)).catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = ROLE_LABELS[user.role] || user.role;

  if (user.role === 'employee') {
    return <EmployeeNavbar user={user} roleLabel={roleLabel} onLogout={handleLogout} />;
  }

  if (user.role === 'admin') {
    return <AdminNavbar user={user} roleLabel={roleLabel} onLogout={handleLogout} />;
  }

  if (user.role === 'manager') {
    return <ManagerNavbar user={user} roleLabel={roleLabel} onLogout={handleLogout} />;
  }

  if (user.role === 'fleet_coordinator') {
    return <CoordinatorNavbar user={user} roleLabel={roleLabel} onLogout={handleLogout} />;
  }

  return (
    <StaffNavbar
      user={user}
      roleLabel={roleLabel}
      awaitingAssignment={awaitingAssignment}
      onLogout={handleLogout}
    />
  );
}
