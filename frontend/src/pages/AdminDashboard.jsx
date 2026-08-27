import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Reports from './Reports';
import Modal from '../components/Modal';
import { useRequestUi } from '../context/RequestUiContext';

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee / Requester' },
  { value: 'manager', label: 'Approving Manager' },
  { value: 'fleet_coordinator', label: 'Fleet Manager' },
  { value: 'admin', label: 'Administrator' },
];

const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

const REQUEST_STATUSES = [
  'Draft',
  'Submitted',
  'Approved',
  'Rejected',
  'Vehicle Assigned',
  'Completed',
  'Cancelled',
];

const DASH_TABS = [
  { key: 'overview', label: 'Overview', shortLabel: 'Overview' },
  { key: 'users', label: 'User Management', shortLabel: 'Users' },
  { key: 'requests', label: 'All Requests', shortLabel: 'Requests' },
  { key: 'reports', label: 'Reports', shortLabel: 'Reports' },
];

const EMPTY_USER = {
  employeeId: '',
  fullName: '',
  email: '',
  password: '',
  department: '',
  role: 'employee',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatCard({ label, value, hint }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-value">{value ?? '—'}</div>
      <div className="admin-stat-label">{label}</div>
      {hint && <div className="admin-stat-hint">{hint}</div>}
    </div>
  );
}

function UserFormModal({ user, onClose, onSaved }) {
  const isEdit = Boolean(user?._id);
  const [form, setForm] = useState(
    user
      ? {
          employeeId: user.employeeId || '',
          fullName: user.fullName || '',
          email: user.email || '',
          password: '',
          department: user.department || '',
          role: user.role || 'employee',
          isActive: user.isActive !== false,
        }
      : { ...EMPTY_USER, isActive: true },
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isEdit) {
        const payload = {
          employeeId: form.employeeId,
          fullName: form.fullName,
          email: form.email,
          department: form.department,
          role: form.role,
          isActive: form.isActive,
        };
        if (form.password) payload.password = form.password;
        await api.updateUser(user._id, payload);
      } else {
        if (!form.password) {
          setError('Password is required for new users.');
          setBusy(false);
          return;
        }
        await api.createUser({
          employeeId: form.employeeId,
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          department: form.department,
          role: form.role,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit User' : 'Create User'} size="md" onClose={onClose}>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleSubmit} className="admin-user-modal">
        <label>Employee ID</label>
        <input
          value={form.employeeId}
          onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
          required
        />
        <label>Full Name</label>
        <input
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
        />
        <label>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <label>{isEdit ? 'New Password (optional)' : 'Password'}</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required={!isEdit}
          minLength={6}
        />
        <label>Department</label>
        <input
          value={form.department}
          onChange={(e) => setForm({ ...form, department: e.target.value })}
          required
        />
        <label>Role</label>
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        {isEdit && (
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Account active
          </label>
        )}
        <div className="btn-row app-modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function UserManagement({ users, onRefresh }) {
  const [search, setSearch] = useState('');
  const [modalUser, setModalUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.employeeId?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>User Management</h2>
          <p className="admin-panel-sub">Manage credentials, roles, and account access.</p>
        </div>
        <button type="button" className="btn" onClick={() => setShowCreate(true)}>
          + New User
        </button>
      </div>
      <div className="admin-toolbar">
        <input
          type="search"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="table-wrap">
        <table className="data-table responsive-table admin-users-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u._id} className={u.isActive === false ? 'inactive-row' : ''}>
                <td data-label="Employee ID">{u.employeeId}</td>
                <td data-label="Name">{u.fullName}</td>
                <td data-label="Email">{u.email}</td>
                <td data-label="Department">{u.department}</td>
                <td data-label="Role">{ROLE_LABELS[u.role] || u.role}</td>
                <td data-label="Status">
                  <span className={`status-pill ${u.isActive !== false ? 'active-pill' : 'inactive-pill'}`}>
                    {u.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td data-label="Actions" className="actions">
                  <button type="button" className="btn secondary btn-sm" onClick={() => setModalUser(u)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="empty-state">No users match your search.</p>}
      </div>
      {(showCreate || modalUser) && (
        <UserFormModal
          user={modalUser}
          onClose={() => {
            setShowCreate(false);
            setModalUser(null);
          }}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

function RequestOversight({ requests, onRefresh }) {
  const { openDetail } = useRequestUi();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    let rows = requests;
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.requestNumber?.toLowerCase().includes(q) ||
        r.destination?.toLowerCase().includes(q) ||
        r.requester?.fullName?.toLowerCase().includes(q),
    );
  }, [requests, search, statusFilter]);

  const handleOverride = async (id, status) => {
    setError('');
    setBusyId(id);
    try {
      await api.overrideRequestStatus(id, status);
      await onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Request Oversight</h2>
          <p className="admin-panel-sub">View all requests and override workflow status when needed.</p>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="admin-toolbar">
        <input
          type="search"
          placeholder="Search requests…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="table-wrap">
        <table className="data-table responsive-table admin-requests-table">
          <thead>
            <tr>
              <th>Request</th>
              <th>Requester</th>
              <th>Destination</th>
              <th>Travel Date</th>
              <th>Status</th>
              <th>Override</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r._id}>
                <td data-label="Request">
                  <button type="button" className="btn-link" onClick={() => openDetail(r._id)}>
                    {r.requestNumber}
                  </button>
                </td>
                <td data-label="Requester">{r.requester?.fullName || '—'}</td>
                <td data-label="Destination">{r.destination}</td>
                <td data-label="Travel Date">{formatDate(r.travelDate)}</td>
                <td data-label="Status">
                  <span className="status-pill">{r.status}</span>
                </td>
                <td data-label="Override" className="actions">
                  <select
                    className="admin-override-select"
                    value={r.status}
                    disabled={busyId === r._id}
                    onChange={(e) => handleOverride(r._id, e.target.value)}
                  >
                    {REQUEST_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="empty-state">No requests found.</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { refreshKey } = useRequestUi();
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [requestStats, setRequestStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [userData, reqData, vehicleData, driverData, uStats, rStats] = await Promise.all([
        api.getUsers(),
        api.getRequests(),
        api.getVehicles(),
        api.getDrivers(),
        api.getUserStats(),
        api.getRequestStats(),
      ]);
      setUsers(userData);
      setRequests(reqData);
      setVehicles(vehicleData);
      setDrivers(driverData);
      setUserStats(uStats);
      setRequestStats(rStats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) return <p className="loading-msg">Loading…</p>;

  return (
    <div className="admin-dashboard">
      {error && <div className="error-banner">{error}</div>}

      <div className="admin-dash-tabs" role="tablist">
        {DASH_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`admin-dash-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <span className="admin-tab-long">{t.label}</span>
            <span className="admin-tab-short">{t.shortLabel}</span>
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="admin-overview">
          <div className="admin-stat-grid">
            <StatCard label="Total Users" value={userStats?.totalUsers} hint={`${userStats?.activeUsers ?? 0} active`} />
            <StatCard label="Vehicles" value={vehicles.length} />
            <StatCard label="Drivers" value={drivers.length} />
            <StatCard label="Pending Approval" value={requestStats?.submittedCount} hint={`${requestStats?.overdueSubmitted ?? 0} overdue`} />
            <StatCard label="Awaiting Assignment" value={requestStats?.awaitingAssignment} />
            <StatCard label="Active Trips" value={requestStats?.activeTrips} />
            <StatCard label="Completed Trips" value={requestStats?.completedTrips} />
            <StatCard label="Draft Requests" value={requestStats?.draftRequests} />
          </div>
          <div className="admin-role-breakdown card">
            <h3>Users by Role</h3>
            <ul className="admin-role-list">
              {ROLE_OPTIONS.map((r) => (
                <li key={r.value}>
                  <span>{r.label}</span>
                  <strong>{userStats?.roleCounts?.[r.value] ?? 0}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === 'users' && <UserManagement users={users} onRefresh={load} />}
      {tab === 'requests' && <RequestOversight requests={requests} onRefresh={load} />}
      {tab === 'reports' && <Reports />}
    </div>
  );
}
