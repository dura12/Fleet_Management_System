import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { MAX_PASSENGERS, toDateInputValue, validatePassengers } from '../utils/requestForm';

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
  const [reassignVehicleId, setReassignVehicleId] = useState('');
  const [reassignDriverId, setReassignDriverId] = useState('');
  const [tripNotes, setTripNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const loadAssignment = async () => {
    const a = await api.getRequestAssignment(id);
    setAssignment(a);
    setTripNotes(a?.notes || '');
    return a;
  };

  const load = async () => {
    setError('');
    try {
      const data = await api.getRequest(id);
      setRequest(data);
      if (['Vehicle Assigned', 'Completed', 'Cancelled'].includes(data.status)) {
        await loadAssignment().catch(() => setAssignment(null));
      } else {
        setAssignment(null);
      }
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (request?.status === 'Draft') {
      setEditForm({
        destination: request.destination,
        purpose: request.purpose,
        travelDate: toDateInputValue(request.travelDate),
        numberOfPassengers: request.numberOfPassengers,
        priority: request.priority || 'Normal',
      });
    } else {
      setEditForm(null);
    }
  }, [request]);

  const loadAssignableResources = useCallback(async () => {
    if (user.role !== 'fleet_coordinator' && user.role !== 'admin') return;
    if (!['Approved', 'Vehicle Assigned'].includes(request?.status)) {
      setVehicles([]);
      setDrivers([]);
      return;
    }
    try {
      const { vehicles: availableVehicles, drivers: availableDrivers } = await api.getAssignOptions(id);
      setVehicles(availableVehicles);
      setDrivers(availableDrivers);
    } catch {
      setVehicles([]);
      setDrivers([]);
    }
  }, [user.role, request?.status, id]);

  useEffect(() => { loadAssignableResources(); }, [loadAssignableResources]);

  const run = async (action, ...args) => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await action(...args);
      await load();
      if (action === api.completeRequest) {
        setVehicleId('');
        setDriverId('');
        setReassignVehicleId('');
        setReassignDriverId('');
        setMessage('Trip completed. Vehicle and driver are available for new assignments.');
      } else {
        setMessage('Done.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !request) return <div className="error-banner">{error}</div>;
  if (!request) return <div className="empty-state">Loading…</div>;

  const isOwner = request.requester?._id === user.id || request.requester === user.id;
  const isAdmin = user.role === 'admin';
  const isManager = user.role === 'manager' || isAdmin;
  const isCoordinator = user.role === 'fleet_coordinator' || isAdmin;
  const canEditDraft = user.role === 'employee' && isOwner && request.status === 'Draft';
  const eligibleVehicles = vehicles.filter(
    (v) => v.seatingCapacity == null || v.seatingCapacity >= request.numberOfPassengers,
  );

  const updateEditForm = (field) => (e) => setEditForm({ ...editForm, [field]: e.target.value });

  const saveDraft = async () => {
    const passengerError = validatePassengers(editForm.numberOfPassengers);
    if (passengerError) {
      setError(passengerError);
      return;
    }
    await run(api.updateRequest, id, {
      destination: editForm.destination,
      purpose: editForm.purpose,
      travelDate: editForm.travelDate,
      numberOfPassengers: Number(editForm.numberOfPassengers),
      priority: editForm.priority,
    });
  };

  const cancelRequest = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const result = await api.cancelRequest(id);
      if (result?.deleted) {
        navigate('/');
        return;
      }
      setMessage('Request cancelled.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Link to="/" className="btn secondary back-link">&larr; Back to list</Link>
      <div className="detail-header">
        <h1>{request.requestNumber}</h1>
        <div className="detail-badges">
          {request.isOverdue && <span className="badge Overdue">Overdue</span>}
          {request.priority === 'Urgent' && <span className="badge Urgent">Urgent</span>}
          <StatusBadge status={request.status} />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {message && <div className="success-banner">{message}</div>}

      <div className="card">
        {canEditDraft && editForm ? (
          <div className="grid-form">
            <div><label>Requester</label><div>{request.requester?.fullName} ({request.requester?.department})</div></div>
            <div><label>Status</label><div><StatusBadge status={request.status} /></div></div>
            <div className="full"><label>Destination</label><input value={editForm.destination} onChange={updateEditForm('destination')} required /></div>
            <div className="full"><label>Purpose</label><textarea value={editForm.purpose} onChange={updateEditForm('purpose')} required /></div>
            <div><label>Travel Date</label><input type="date" value={editForm.travelDate} onChange={updateEditForm('travelDate')} required /></div>
            <div><label>Number of Passengers</label><input type="number" min="1" max={MAX_PASSENGERS} value={editForm.numberOfPassengers} onChange={updateEditForm('numberOfPassengers')} required /></div>
            <div><label>Priority</label>
              <select value={editForm.priority} onChange={updateEditForm('priority')}>
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="grid-form">
            <div><label>Requester</label><div>{request.requester?.fullName} ({request.requester?.department})</div></div>
            <div><label>Travel Date</label><div>{new Date(request.travelDate).toLocaleDateString()}</div></div>
            <div><label>Priority</label><div>{request.priority === 'Urgent' ? <span className="badge Urgent">Urgent</span> : 'Normal'}</div></div>
            <div className="full"><label>Destination</label><div>{request.destination}</div></div>
            <div className="full"><label>Purpose</label><div>{request.purpose}</div></div>
            <div><label>Number of Passengers</label><div>{request.numberOfPassengers}</div></div>
            {request.rejectionReason && <div className="full"><label>Rejection Reason</label><div>{request.rejectionReason}</div></div>}
          </div>
        )}
      </div>

      {canEditDraft && (
        <div className="card">
          <h2>Actions</h2>
          <p className="subtitle">Save your changes, then submit when ready. The manager will not see this request until you submit it.</p>
          <div className="btn-row">
            <button className="btn secondary" disabled={busy} onClick={saveDraft}>Save Changes</button>
            <button className="btn" disabled={busy} onClick={() => run(api.submitRequest, id)}>Submit for Approval</button>
            <button className="btn danger" disabled={busy} onClick={cancelRequest}>Cancel Request</button>
          </div>
        </div>
      )}

      {user.role === 'employee' && isOwner && request.status === 'Submitted' && (
        <div className="card">
          <h2>Actions</h2>
          <div className="btn-row">
            <button className="btn danger" disabled={busy} onClick={cancelRequest}>Cancel Request</button>
          </div>
        </div>
      )}

      {(user.role === 'employee' && isOwner || isManager) && ['Approved', 'Vehicle Assigned'].includes(request.status) && (
        <div className="card">
          <h2>Cancel Trip</h2>
          <p className="subtitle">Cancelling releases any assigned vehicle back to Available.</p>
          <div className="btn-row">
            <button className="btn danger" disabled={busy} onClick={cancelRequest}>Cancel Request</button>
          </div>
        </div>
      )}

      {isManager && request.status === 'Submitted' && (
        <div className="card">
          <h2>Manager Decision</h2>
          {request.isOverdue && <p className="subtitle"><span className="badge Overdue">Overdue</span> Submitted more than 48 hours ago.</p>}
          {request.requesterOpenCount > 0 && <p className="subtitle">Requester has {request.requesterOpenCount} open request(s).</p>}
          <label>Rejection reason (only needed if rejecting)</label>
          <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
          <div className="btn-row">
            <button className="btn success" disabled={busy} onClick={() => run(api.approveRequest, id)}>Approve</button>
            <button className="btn danger" disabled={busy} onClick={() => run(api.rejectRequest, id, rejectionReason)}>Reject</button>
          </div>
        </div>
      )}

      {isCoordinator && request.status === 'Submitted' && (
        <div className="card">
          <h2>Awaiting Manager Approval</h2>
          <p className="subtitle">
            {request.priority === 'Urgent'
              ? 'This urgent request is prioritized in the manager queue. Assignment controls appear here once a manager approves it.'
              : 'A manager must approve this request before you can assign a vehicle and driver.'}
          </p>
        </div>
      )}

      {isCoordinator && request.status === 'Approved' && (
        <div className="card">
          <h2>Assign Vehicle &amp; Driver</h2>
          <p className="subtitle">Needs a vehicle with at least {request.numberOfPassengers} seats.</p>
          <div className="grid-form">
            <div>
              <label>Available Vehicle</label>
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                <option value="">Select a vehicle…</option>
                {eligibleVehicles.map((v) => (
                  <option key={v._id} value={v._id}>{v.plateNumber} — {v.model} ({v.seatingCapacity} seats)</option>
                ))}
              </select>
            </div>
            <div>
              <label>Driver (valid license)</label>
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">Select a driver…</option>
                {drivers.map((d) => <option key={d._id} value={d._id}>{d.driverName} — {d.licenseNumber}</option>)}
              </select>
            </div>
          </div>
          {eligibleVehicles.length === 0 && <p className="subtitle">No available vehicles with enough seating capacity.</p>}
          <div className="btn-row">
            <button className="btn" disabled={busy || !vehicleId || !driverId} onClick={() => run(api.assignVehicle, id, { vehicleId, driverId })}>Confirm Assignment</button>
          </div>
        </div>
      )}

      {isCoordinator && request.status === 'Vehicle Assigned' && (
        <div className="card">
          <h2>Trip in Progress</h2>
          <label>Trip notes (optional — incidents, driver updates by phone)</label>
          <textarea value={tripNotes} onChange={(e) => setTripNotes(e.target.value)} />
          <div className="btn-row">
            <button className="btn secondary" disabled={busy} onClick={() => run(api.updateAssignmentNotes, id, tripNotes)}>Save Notes</button>
            <button className="btn success" disabled={busy} onClick={() => run(api.completeRequest, id, tripNotes)}>Mark Trip Completed</button>
          </div>
        </div>
      )}

      {isCoordinator && request.status === 'Vehicle Assigned' && (
        <div className="card">
          <h2>Reassign (breakdown / driver change)</h2>
          <div className="grid-form">
            <div>
              <label>Replacement vehicle</label>
              <select value={reassignVehicleId} onChange={(e) => setReassignVehicleId(e.target.value)}>
                <option value="">Select replacement…</option>
                {eligibleVehicles.filter((v) => v._id !== assignment?.vehicle?._id).map((v) => (
                  <option key={v._id} value={v._id}>{v.plateNumber} — {v.model} ({v.seatingCapacity} seats)</option>
                ))}
              </select>
            </div>
            <div>
              <label>Replacement driver</label>
              <select value={reassignDriverId} onChange={(e) => setReassignDriverId(e.target.value)}>
                <option value="">Select driver…</option>
                {drivers.map((d) => <option key={d._id} value={d._id}>{d.driverName}</option>)}
              </select>
            </div>
          </div>
          <div className="btn-row">
            <button className="btn secondary" disabled={busy || !reassignVehicleId} onClick={() => run(api.reassignVehicle, id, { vehicleId: reassignVehicleId })}>Reassign Vehicle</button>
            <button className="btn secondary" disabled={busy || !reassignDriverId} onClick={() => run(api.reassignDriver, id, { driverId: reassignDriverId })}>Reassign Driver</button>
          </div>
          <p className="subtitle">Reassigning a vehicle marks the original one Under Maintenance (breakdown protocol).</p>
        </div>
      )}

      {isAdmin && (
        <div className="card admin-override-card">
          <h2>Administrator Override</h2>
          <p className="subtitle">Force a workflow status change. Vehicle resources are released when leaving an active assignment.</p>
          <div className="btn-row">
            <select
              defaultValue={request.status}
              onChange={(e) => run(api.overrideRequestStatus, id, e.target.value)}
              disabled={busy}
            >
              {['Draft', 'Submitted', 'Approved', 'Rejected', 'Vehicle Assigned', 'Completed', 'Cancelled'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {assignment && (
        <div className="card">
          <h2>Assignment Details</h2>
          <div className="grid-form">
            <div><label>Vehicle</label><div>{assignment.vehicle?.plateNumber} — {assignment.vehicle?.model}</div></div>
            <div><label>Driver</label><div>{assignment.driver?.driverName} ({assignment.driver?.licenseNumber})</div></div>
            <div><label>Assignment Date</label><div>{new Date(assignment.assignmentDate).toLocaleDateString()}</div></div>
            {assignment.returnedAt && <div><label>Completed On</label><div>{new Date(assignment.returnedAt).toLocaleDateString()}</div></div>}
            {assignment.notes && <div className="full"><label>Trip Notes</label><div>{assignment.notes}</div></div>}
          </div>
        </div>
      )}
    </div>
  );
}
