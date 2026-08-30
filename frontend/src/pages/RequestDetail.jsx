import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { validatePassengers, requestToFormFields, formToRequestPayload, formatDateRange, formatTripDuration } from '../utils/requestForm';
import RequestFormFields, { useRequestFormSuggestions } from '../components/RequestFormFields';

export default function RequestDetail({
  requestId,
  embedded = false,
  onClose,
  onChanged,
}) {
  const params = useParams();
  const id = requestId || params.id;
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
  const [confirmAction, setConfirmAction] = useState(null);
  const { suggestions, loading: suggestionsLoading } = useRequestFormSuggestions();

  const finishClose = useCallback(() => {
    onChanged?.();
    if (onClose) onClose();
    else navigate('/');
  }, [onClose, onChanged, navigate]);

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
    setVehicleId('');
    setDriverId('');
    setReassignVehicleId('');
    setReassignDriverId('');
    setError('');
    setMessage('');
  }, [id]);

  useEffect(() => {
    if (request?.status === 'Draft') {
      setEditForm(requestToFormFields(request));
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
      onChanged?.();
      if (action === api.completeRequest) {
        setVehicleId('');
        setDriverId('');
        setReassignVehicleId('');
        setReassignDriverId('');
        setMessage('Trip completed. Vehicle and driver are available for new assignments.');
      } else if (action === api.assignVehicle) {
        setVehicleId('');
        setDriverId('');
        setMessage('Vehicle and driver assigned. The trip now appears under Active Assignments.');
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
  const departureStarted = new Date(request.travelDate) <= new Date();
  const beforeExpectedReturn = request.returnDate && new Date() < new Date(request.returnDate);
  const coordinatorCanCancelAssigned =
    isCoordinator &&
    request.status === 'Vehicle Assigned' &&
    !departureStarted;

  const saveDraft = async () => {
    const passengerError = validatePassengers(editForm.numberOfPassengers);
    if (passengerError) {
      setError(passengerError);
      return;
    }
    await run(api.updateRequest, id, formToRequestPayload(editForm));
  };

  const cancelRequest = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const result = await api.cancelRequest(id);
      setConfirmAction(null);
      onChanged?.();
      if (result?.deleted) {
        finishClose();
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

  const askCancelRequest = () => {
    const isDraft = request?.status === 'Draft';
    setConfirmAction({
      title: isDraft ? 'Discard this request?' : 'Cancel this request?',
      message: isDraft
        ? 'This draft will be permanently removed.'
        : 'The trip will be cancelled and any assigned vehicle will be released.',
      confirmLabel: isDraft ? 'Yes, discard' : 'Yes, cancel',
      danger: true,
      onConfirm: cancelRequest,
    });
  };

  const askRejectRequest = () => {
    setConfirmAction({
      title: 'Reject this request?',
      message: rejectionReason.trim()
        ? `Reason: ${rejectionReason.trim()}`
        : 'The requester will be notified that this request was rejected.',
      confirmLabel: 'Reject',
      danger: true,
      onConfirm: async () => {
        setBusy(true);
        try {
          await api.rejectRequest(id, rejectionReason);
          setConfirmAction(null);
          setMessage('Request rejected.');
          onChanged?.();
          await load();
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const askAdminOverride = (nextStatus) => {
    if (nextStatus === request?.status) return;
    setConfirmAction({
      title: 'Change request status?',
      message: `Set ${request.requestNumber} from "${request.status}" to "${nextStatus}"?`,
      confirmLabel: 'Change status',
      danger: true,
      onConfirm: async () => {
        await run(api.overrideRequestStatus, id, nextStatus);
        setConfirmAction(null);
      },
    });
  };

  const askCompleteTrip = () => {
    if (!beforeExpectedReturn) {
      run(api.completeRequest, id, tripNotes);
      return;
    }
    const expectedReturnText = formatDateRange(request.returnDate, request.returnDate);
    setConfirmAction({
      title: 'Mark trip completed?',
      message: `Expected return is ${expectedReturnText}. The vehicle will be released and the requester will be notified.`,
      confirmLabel: 'Mark completed',
      danger: false,
      onConfirm: async () => {
        setConfirmAction(null);
        await run(api.completeRequest, id, tripNotes);
      },
    });
  };

  return (
    <div className={embedded ? 'request-detail-embedded' : ''}>
      {!embedded && (
        <Link to="/" className="btn secondary back-link">&larr; Back to list</Link>
      )}
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
          suggestionsLoading ? (
            <div className="empty-state">Loading form…</div>
          ) : (
            <RequestFormFields
              form={editForm}
              setForm={setEditForm}
              suggestions={suggestions}
              idPrefix="detail"
            />
          )
        ) : (
          <div className="grid-form">
            <div><label>Requester</label><div>{request.requester?.fullName} ({request.requester?.department})</div></div>
            <div><label>Start Location</label><div>{request.branch || '—'}</div></div>
            <div><label>Trip Duration</label><div>{formatTripDuration(request.tripDuration)}</div></div>
            <div><label>Departure</label><div>{formatDateRange(request.travelDate, request.travelDate)}</div></div>
            <div><label>Expected Return</label><div>{formatDateRange(request.returnDate, request.returnDate)}</div></div>
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
            <button className="btn danger" disabled={busy} onClick={askCancelRequest}>Cancel Request</button>
          </div>
        </div>
      )}

      {user.role === 'employee' && isOwner && request.status === 'Submitted' && (
        <div className="card">
          <h2>Actions</h2>
          <div className="btn-row">
            <button className="btn danger" disabled={busy} onClick={askCancelRequest}>Cancel Request</button>
          </div>
        </div>
      )}

      {(user.role === 'employee' && isOwner || isManager) && ['Approved', 'Vehicle Assigned'].includes(request.status) && (
        <div className="card">
          <h2>Cancel Trip</h2>
          <p className="subtitle">Cancelling releases any assigned vehicle back to Available.</p>
          <div className="btn-row">
            <button className="btn danger" disabled={busy} onClick={askCancelRequest}>Cancel Request</button>
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
            <button className="btn danger" disabled={busy} onClick={askRejectRequest}>Reject</button>
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
          <h2>{departureStarted ? 'Trip in Progress' : 'Scheduled Trip'}</h2>
          {!departureStarted && (
            <p className="subtitle">
              Departure is scheduled for {formatDateRange(request.travelDate, request.travelDate)}.
              Cancel to release the vehicle, or wait until departure to mark the trip completed.
            </p>
          )}
          {coordinatorCanCancelAssigned && (
            <div className="btn-row" style={{ marginBottom: '1rem' }}>
              <button className="btn danger" disabled={busy} onClick={askCancelRequest}>Cancel Trip</button>
            </div>
          )}
          <label>Trip notes (optional — incidents, driver updates by phone)</label>
          <textarea value={tripNotes} onChange={(e) => setTripNotes(e.target.value)} />
          <div className="btn-row">
            <button className="btn secondary" disabled={busy} onClick={() => run(api.updateAssignmentNotes, id, tripNotes)}>Save Notes</button>
            <button
              className="btn success"
              disabled={busy || !departureStarted}
              onClick={askCompleteTrip}
            >
              Mark Trip Completed
            </button>
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
              value={request.status}
              onChange={(e) => askAdminOverride(e.target.value)}
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
            {assignment.returnedAt && <div><label>Actual Return</label><div>{new Date(assignment.returnedAt).toLocaleString()}</div></div>}
            {assignment.notes && <div className="full"><label>Trip Notes</label><div>{assignment.notes}</div></div>}
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          danger={confirmAction.danger}
          busy={busy}
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmAction.onConfirm}
        />
      )}
    </div>
  );
}
