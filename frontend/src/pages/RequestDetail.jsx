import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError('');
    try {
      const data = await api.getRequest(id);
      setRequest(data);
      if (['Vehicle Assigned', 'Completed'].includes(data.status)) {
        const a = await api.getRequestAssignment(id);
        setAssignment(a);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (user.role === 'fleet_coordinator' && request?.status === 'Approved') {
      api.getVehicles({ status: 'Available' }).then(setVehicles).catch(() => {});
      api.getDrivers().then((all) => setDrivers(all.filter((d) => d.isActive && new Date(d.licenseExpiry) >= new Date()))).catch(() => {});
    }
  }, [request, user.role]);

  const run = async (action, ...args) => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await action(...args);
      setMessage('Done.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !request) return <div className="error-banner">{error}</div>;
  if (!request) return <div className="empty-state">Loading\u2026</div>;

  const isOwner = request.requester?._id === user.id || request.requester === user.id;

  return (
    <div>
      <Link to="/" className="btn secondary" style={{ marginBottom: '1rem', display: 'inline-block' }}>&larr; Back to list</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{request.requestNumber}</h1>
        <StatusBadge status={request.status} />
      </div>

      {error && <div className="error-banner">{error}</div>}
      {message && <div className="success-banner">{message}</div>}

      <div className="card">
        <div className="grid-form">
          <div><label>Requester</label><div>{request.requester?.fullName} ({request.requester?.department})</div></div>
          <div><label>Travel Date</label><div>{new Date(request.travelDate).toLocaleDateString()}</div></div>
          <div className="full"><label>Destination</label><div>{request.destination}</div></div>
          <div className="full"><label>Purpose</label><div>{request.purpose}</div></div>
          <div><label>Number of Passengers</label><div>{request.numberOfPassengers}</div></div>
          {request.rejectionReason && (
            <div className="full"><label>Rejection Reason</label><div>{request.rejectionReason}</div></div>
          )}
        </div>
      </div>

      {/* Employee actions */}
      {user.role === 'employee' && isOwner && request.status === 'Draft' && (
        <div className="card">
          <h2>Actions</h2>
          <div className="btn-row">
            <button className="btn" disabled={busy} onClick={() => run(api.submitRequest, id)}>Submit for Approval</button>
            <button className="btn danger" disabled={busy} onClick={() => run(async () => { await api.cancelRequest(id); navigate('/'); })}>Cancel Request</button>
          </div>
        </div>
      )}
      {user.role === 'employee' && isOwner && request.status === 'Submitted' && (
        <div className="card">
          <h2>Actions</h2>
          <div className="btn-row">
            <button className="btn danger" disabled={busy} onClick={() => run(async () => { await api.cancelRequest(id); navigate('/'); })}>Cancel Request</button>
          </div>
        </div>
      )}

      {/* Manager actions */}
      {user.role === 'manager' && request.status === 'Submitted' && (
        <div className="card">
          <h2>Manager Decision</h2>
          <label>Rejection reason (only needed if rejecting)</label>
          <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
          <div className="btn-row">
            <button className="btn success" disabled={busy} onClick={() => run(api.approveRequest, id)}>Approve</button>
            <button className="btn danger" disabled={busy} onClick={() => run(api.rejectRequest, id, rejectionReason)}>Reject</button>
          </div>
        </div>
      )}

      {/* Fleet Coordinator: assignment */}
      {user.role === 'fleet_coordinator' && request.status === 'Approved' && (
        <div className="card">
          <h2>Assign Vehicle &amp; Driver</h2>
          <div className="grid-form">
            <div>
              <label>Available Vehicle</label>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                <option value="">Select a vehicle\u2026</option>
                {vehicles.map((v) => <option key={v._id} value={v._id}>{v.plateNumber} \u2014 {v.model} ({v.vehicleType})</option>)}
              </select>
            </div>
            <div>
              <label>Driver (valid license)</label>
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">Select a driver\u2026</option>
                {drivers.map((d) => <option key={d._id} value={d._id}>{d.driverName} \u2014 {d.licenseNumber}</option>)}
              </select>
            </div>
          </div>
          {vehicles.length === 0 && <p className="subtitle">No available vehicles right now.</p>}
          <div className="btn-row">
            <button
              className="btn"
              disabled={busy || !vehicleId || !driverId}
              onClick={() => run(api.assignVehicle, id, { vehicleId, driverId })}
            >
              Confirm Assignment
            </button>
          </div>
        </div>
      )}

      {/* Fleet Coordinator: complete trip */}
      {user.role === 'fleet_coordinator' && request.status === 'Vehicle Assigned' && (
        <div className="card">
          <h2>Trip in Progress</h2>
          <p className="subtitle">Once the trip is finished, mark it complete to return the vehicle to Available status.</p>
          <div className="btn-row">
            <button className="btn success" disabled={busy} onClick={() => run(api.completeRequest, id)}>Mark Trip Completed</button>
          </div>
        </div>
      )}

      {assignment && (
        <div className="card">
          <h2>Assignment Details</h2>
          <div className="grid-form">
            <div><label>Vehicle</label><div>{assignment.vehicle?.plateNumber} \u2014 {assignment.vehicle?.model}</div></div>
            <div><label>Driver</label><div>{assignment.driver?.driverName} ({assignment.driver?.licenseNumber})</div></div>
            <div><label>Assignment Date</label><div>{new Date(assignment.assignmentDate).toLocaleDateString()}</div></div>
            {assignment.returnedAt && <div><label>Completed On</label><div>{new Date(assignment.returnedAt).toLocaleDateString()}</div></div>}
          </div>
        </div>
      )}
    </div>
  );
}
