import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const emptyForm = { driverId: '', driverName: '', employeeId: '', licenseNumber: '', licenseExpiry: '' };

function isExpired(date) {
  return new Date(date) < new Date();
}

export default function Drivers() {
  const { user } = useAuth();
  const canEdit = user.role === 'fleet_coordinator';
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      setDrivers(await api.getDrivers(params));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const startEdit = (d) => {
    setEditingId(d._id);
    setForm({
      driverId: d.driverId,
      driverName: d.driverName,
      employeeId: d.employeeId || '',
      licenseNumber: d.licenseNumber,
      licenseExpiry: d.licenseExpiry.slice(0, 10),
    });
    setShowForm(true);
  };

  const startNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        const { driverId, ...rest } = form;
        await api.updateDriver(editingId, rest);
      } else {
        await api.createDriver(form);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      await api.deleteDriver(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h1>Drivers</h1>
          <p className="subtitle">Driver roster and license status.</p>
        </div>
        {canEdit && <button className="btn" onClick={startNew}>+ Add Driver</button>}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="filters">
        <div>
          <label>Search</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, license\u2026" />
        </div>
      </div>

      {showForm && canEdit && (
        <form className="card" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Edit Driver' : 'New Driver'}</h2>
          <div className="grid-form">
            {!editingId && (
              <div>
                <label>Driver ID</label>
                <input value={form.driverId} onChange={update('driverId')} required />
              </div>
            )}
            <div>
              <label>Driver Name</label>
              <input value={form.driverName} onChange={update('driverName')} required />
            </div>
            <div>
              <label>Employee ID (optional)</label>
              <input value={form.employeeId} onChange={update('employeeId')} />
            </div>
            <div>
              <label>License Number</label>
              <input value={form.licenseNumber} onChange={update('licenseNumber')} required />
            </div>
            <div>
              <label>License Expiry</label>
              <input type="date" value={form.licenseExpiry} onChange={update('licenseExpiry')} required />
            </div>
          </div>
          <div className="btn-row">
            <button className="btn" type="submit">{editingId ? 'Save Changes' : 'Create Driver'}</button>
            <button className="btn secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card">
        {drivers.length === 0 ? (
          <div className="empty-state">No drivers found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Driver ID</th><th>Name</th><th>License #</th><th>License Expiry</th><th>Status</th>{canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d._id}>
                  <td>{d.driverId}</td>
                  <td>{d.driverName}</td>
                  <td>{d.licenseNumber}</td>
                  <td>{new Date(d.licenseExpiry).toLocaleDateString()}</td>
                  <td>
                    {!d.isActive ? (
                      <span className="badge Inactive">Inactive</span>
                    ) : isExpired(d.licenseExpiry) ? (
                      <span className="badge Rejected">License Expired</span>
                    ) : (
                      <span className="badge Available">Active</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="actions">
                      <button className="btn secondary" onClick={() => startEdit(d)}>Edit</button>{' '}
                      <button className="btn danger" onClick={() => handleDelete(d._id)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
