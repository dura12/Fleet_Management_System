import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { MAX_PASSENGERS, validatePassengers } from '../utils/requestForm';

export default function NewRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ destination: '', purpose: '', travelDate: '', numberOfPassengers: 1, priority: 'Normal' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e, alsoSubmit) => {
    e.preventDefault();
    setError('');
    const passengerError = validatePassengers(form.numberOfPassengers);
    if (passengerError) {
      setError(passengerError);
      return;
    }
    setSaving(true);
    try {
      const created = await api.createRequest({
        ...form,
        numberOfPassengers: Number(form.numberOfPassengers),
      });
      if (alsoSubmit) {
        await api.submitRequest(created._id);
      }
      navigate(`/requests/${created._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>New Vehicle Request</h1>
      <p className="subtitle">Save as a draft to edit later, or submit directly for manager approval.</p>
      {error && <div className="error-banner">{error}</div>}
      <form className="card">
        <div className="grid-form">
          <div className="full">
            <label>Destination</label>
            <input value={form.destination} onChange={update('destination')} required />
          </div>
          <div className="full">
            <label>Purpose</label>
            <textarea value={form.purpose} onChange={update('purpose')} required />
          </div>
          <div>
            <label>Travel Date</label>
            <input type="date" value={form.travelDate} onChange={update('travelDate')} required />
          </div>
          <div>
            <label>Number of Passengers</label>
            <input type="number" min="1" max={MAX_PASSENGERS} value={form.numberOfPassengers} onChange={update('numberOfPassengers')} required />
          </div>
          <div>
            <label>Priority</label>
            <select value={form.priority} onChange={update('priority')}>
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
        </div>
        <div className="btn-row">
          <button className="btn secondary" onClick={(e) => handleSubmit(e, false)} disabled={saving}>Save as Draft</button>
          <button className="btn" onClick={(e) => handleSubmit(e, true)} disabled={saving}>Save &amp; Submit for Approval</button>
        </div>
      </form>
    </div>
  );
}
