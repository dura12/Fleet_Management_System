import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const STATUSES = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Vehicle Assigned', 'Completed'];

export default function RequestsList() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (status) params.status = status;
      const data = await api.getRequests(params);
      setRequests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const counts = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const heading = {
    employee: 'My Vehicle Requests',
    manager: 'Vehicle Requests \u2014 Approval Queue',
    fleet_coordinator: 'Vehicle Requests \u2014 Fleet Assignment',
  }[user.role];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h1>{heading}</h1>
          <p className="subtitle">
            {user.role === 'employee' && 'Create and track your own vehicle requests.'}
            {user.role === 'manager' && 'Review submitted requests and record your decision.'}
            {user.role === 'fleet_coordinator' && 'Assign vehicles and drivers, and close out completed trips.'}
          </p>
        </div>
        {user.role === 'employee' && <Link to="/requests/new" className="btn">+ New Request</Link>}
      </div>

      <div className="stat-row">
        {STATUSES.map((s) => (
          <div className="stat-box" key={s}>
            <div className="num">{counts[s] || 0}</div>
            <div className="label">{s}</div>
          </div>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="filters">
        <div>
          <label>Filter by status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading\u2026</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">No requests found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Request #</th>
                <th>Requester</th>
                <th>Destination</th>
                <th>Travel Date</th>
                <th>Passengers</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td>{r.requestNumber}</td>
                  <td>{r.requester?.fullName || '\u2014'}</td>
                  <td>{r.destination}</td>
                  <td>{new Date(r.travelDate).toLocaleDateString()}</td>
                  <td>{r.numberOfPassengers}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="actions"><Link to={`/requests/${r._id}`} className="btn secondary">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
