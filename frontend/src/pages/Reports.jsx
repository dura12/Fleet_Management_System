import { useEffect, useState } from 'react';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';

const TABS = [
  { key: 'vehicle-register', label: 'Vehicle Register' },
  { key: 'requests-by-status', label: 'Requests by Status' },
  { key: 'assignment-history', label: 'Assignment History' },
];

export default function Reports() {
  const [tab, setTab] = useState('vehicle-register');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    const fetcher = {
      'vehicle-register': api.vehicleRegister,
      'requests-by-status': api.requestsByStatus,
      'assignment-history': api.assignmentHistory,
    }[tab];
    fetcher()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div>
      <h1>Reports</h1>
      <p className="subtitle">Fleet reports available on demand.</p>

      <div className="filters">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`btn ${tab === t.key ? '' : 'secondary'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading\u2026</div>
        ) : tab === 'vehicle-register' ? (
          <VehicleRegisterTable data={data} />
        ) : tab === 'requests-by-status' ? (
          <RequestsByStatusTable data={data} />
        ) : (
          <AssignmentHistoryTable data={data} />
        )}
      </div>
    </div>
  );
}

function VehicleRegisterTable({ data }) {
  if (!data || data.length === 0) return <div className="empty-state">No vehicles found.</div>;
  return (
    <table>
      <thead><tr><th>Vehicle ID</th><th>Plate</th><th>Model</th><th>Type</th><th>Mileage</th><th>Status</th></tr></thead>
      <tbody>
        {data.map((v) => (
          <tr key={v._id}>
            <td>{v.vehicleId}</td><td>{v.plateNumber}</td><td>{v.model}</td><td>{v.vehicleType}</td>
            <td>{v.currentMileage.toLocaleString()}</td><td><StatusBadge status={v.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RequestsByStatusTable({ data }) {
  if (!data || Object.keys(data).length === 0) return <div className="empty-state">No requests found.</div>;
  return (
    <div>
      {Object.entries(data).map(([status, requests]) => (
        <div key={status} style={{ marginBottom: '1.4rem' }}>
          <h2><StatusBadge status={status} /> <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.85rem' }}>({requests.length})</span></h2>
          <table>
            <thead><tr><th>Request #</th><th>Requester</th><th>Destination</th><th>Travel Date</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td>{r.requestNumber}</td>
                  <td>{r.requester?.fullName}</td>
                  <td>{r.destination}</td>
                  <td>{new Date(r.travelDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function AssignmentHistoryTable({ data }) {
  if (!data || data.length === 0) return <div className="empty-state">No assignments found.</div>;
  return (
    <table>
      <thead>
        <tr><th>Assignment #</th><th>Request #</th><th>Requester</th><th>Vehicle</th><th>Driver</th><th>Assigned</th><th>Returned</th></tr>
      </thead>
      <tbody>
        {data.map((a) => (
          <tr key={a._id}>
            <td>{a.assignmentId}</td>
            <td>{a.request?.requestNumber}</td>
            <td>{a.request?.requester?.fullName}</td>
            <td>{a.vehicle?.plateNumber} ({a.vehicle?.model})</td>
            <td>{a.driver?.driverName}</td>
            <td>{new Date(a.assignmentDate).toLocaleDateString()}</td>
            <td>{a.returnedAt ? new Date(a.returnedAt).toLocaleDateString() : '\u2014'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
