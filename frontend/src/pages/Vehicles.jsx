import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const STATUSES = ['Available', 'Assigned', 'Under Maintenance', 'Inactive'];
const emptyForm = { vehicleId: '', plateNumber: '', model: '', vehicleType: '', seatingCapacity: 4, currentMileage: 0, status: 'Available' };

export default function Vehicles() {
  const { user } = useAuth();
  const canEdit = user.role === 'fleet_coordinator' || user.role === 'admin';
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (status) params.status = status;
      setVehicles(await api.getVehicles(params));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search, status]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const startEdit = (v) => {
    setEditingId(v._id);
    setForm({
      vehicleId: v.vehicleId,
      plateNumber: v.plateNumber,
      model: v.model,
      vehicleType: v.vehicleType,
      seatingCapacity: v.seatingCapacity ?? 4,
      currentMileage: v.currentMileage,
      status: v.status,
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
      const payload = {
        ...form,
        seatingCapacity: Number(form.seatingCapacity),
        currentMileage: Number(form.currentMileage),
      };
      if (editingId) {
        const { vehicleId, ...rest } = payload;
        await api.updateVehicle(editingId, rest);
      } else {
        await api.createVehicle(payload);
      }
      closeForm();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    setError('');
    try {
      await api.deleteVehicle(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Vehicles</h1>
          <p className="subtitle">Fleet register with current status.</p>
        </div>
        {canEdit && (
          <div className="page-header-actions">
            <button className="btn" type="button" onClick={startNew}>+ Add Vehicle</button>
          </div>
        )}
      </div>

      {error && !showForm && <div className="error-banner">{error}</div>}

      <div className="filters">
        <div>
          <label>Search</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Plate, model, ID…" />
        </div>
        <div>
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {showForm && canEdit && (
        <Modal title={editingId ? 'Edit Vehicle' : 'New Vehicle'} size="md" onClose={closeForm}>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="grid-form">
              {!editingId && (
                <div>
                  <label>Vehicle ID</label>
                  <input value={form.vehicleId} onChange={update('vehicleId')} required />
                </div>
              )}
              <div>
                <label>Plate Number</label>
                <input value={form.plateNumber} onChange={update('plateNumber')} required />
              </div>
              <div>
                <label>Model</label>
                <input value={form.model} onChange={update('model')} required />
              </div>
              <div>
                <label>Vehicle Type</label>
                <input value={form.vehicleType} onChange={update('vehicleType')} required />
              </div>
              <div>
                <label>Seating Capacity</label>
                <input type="number" min="1" value={form.seatingCapacity} onChange={update('seatingCapacity')} required />
              </div>
              <div>
                <label>Current Mileage</label>
                <input type="number" min="0" value={form.currentMileage} onChange={update('currentMileage')} required />
              </div>
              <div>
                <label>Status</label>
                <select value={form.status} onChange={update('status')}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="btn-row app-modal-actions">
              <button className="btn secondary" type="button" onClick={closeForm}>Cancel</button>
              <button className="btn" type="submit">{editingId ? 'Save Changes' : 'Create Vehicle'}</button>
            </div>
          </form>
        </Modal>
      )}

      <div className="card table-scroll">
        {vehicles.length === 0 ? (
          <div className="empty-state">No vehicles found.</div>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Vehicle ID</th><th>Plate</th><th>Model</th><th>Type</th><th>Seats</th><th>Mileage</th><th>Status</th>{canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v._id}>
                  <td data-label="Vehicle ID">{v.vehicleId}</td>
                  <td data-label="Plate">{v.plateNumber}</td>
                  <td data-label="Model">{v.model}</td>
                  <td data-label="Type">{v.vehicleType}</td>
                  <td data-label="Seats">{v.seatingCapacity ?? '—'}</td>
                  <td data-label="Mileage">{v.currentMileage.toLocaleString()}</td>
                  <td data-label="Status"><StatusBadge status={v.status} /></td>
                  {canEdit && (
                    <td className="actions" data-label="Actions">
                      <button className="btn secondary" type="button" onClick={() => startEdit(v)}>Edit</button>{' '}
                      <button className="btn danger" type="button" onClick={() => handleDelete(v._id)}>Delete</button>
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
