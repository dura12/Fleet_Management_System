import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

function formatQueueDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function AssignmentQueueCard({ request }) {
  const overdue = request.isOverdue;
  const urgent = request.priority === 'Urgent';

  return (
    <Link to={`/requests/${request._id}`} className={`queue-card ${overdue ? 'queue-card-overdue' : ''}`}>
      <div className="queue-card-top">
        <span className="queue-card-id">{request.requestNumber}</span>
        {overdue && <span className="queue-overdue-tag">Overdue</span>}
        {!overdue && urgent && <span className="queue-urgent-tag">Urgent</span>}
      </div>
      <div className="queue-card-requester">{request.requester?.fullName || '—'}</div>
      <div className="queue-card-meta">
        <span>{request.numberOfPassengers} Passenger{request.numberOfPassengers !== 1 ? 's' : ''}</span>
        <span className="queue-card-dot">·</span>
        <span>{formatQueueDate(request.travelDate)}</span>
      </div>
      <div className="queue-card-destination">{request.destination}</div>
      <span className="queue-card-action">Assign →</span>
    </Link>
  );
}

function VehicleListItem({ vehicle }) {
  const unavailable = vehicle.status !== 'Available';
  return (
    <div className={`fleet-list-item ${unavailable ? 'unavailable' : ''}`}>
      <div>
        <div className="fleet-list-id">{vehicle.vehicleId}</div>
        <div className="fleet-list-name">{vehicle.model}</div>
      </div>
      <div className="fleet-list-meta">
        {vehicle.status === 'Available' && (
          <span>{vehicle.seatingCapacity ?? '—'} Seats</span>
        )}
        {vehicle.status === 'Under Maintenance' && (
          <span className="maintenance-label">⚙ Maintenance</span>
        )}
        {vehicle.status === 'Assigned' && <span className="assigned-label">Assigned</span>}
        {vehicle.status === 'Inactive' && <span>Inactive</span>}
      </div>
    </div>
  );
}

function DriverListItem({ driver }) {
  return (
    <div className="fleet-list-item driver-item">
      <div className="driver-avatar-sm">{driver.driverName?.charAt(0) || '?'}</div>
      <div>
        <div className="fleet-list-name">{driver.driverName}</div>
        <div className="fleet-list-sub">{driver.licenseNumber}</div>
      </div>
    </div>
  );
}

export default function FleetCoordinatorDashboard() {
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [reqData, vehicleData, driverData, queueStats] = await Promise.all([
        api.getRequests(),
        api.getVehicles(),
        api.getDrivers(),
        api.getRequestStats(),
      ]);
      setRequests(reqData);
      setVehicles(vehicleData);
      setDrivers(driverData);
      setStats(queueStats);

      const active = reqData.filter((r) => r.status === 'Vehicle Assigned');
      const pairs = await Promise.all(
        active.map(async (r) => {
          try {
            const a = await api.getRequestAssignment(r._id);
            return [r._id, a];
          } catch {
            return [r._id, null];
          }
        }),
      );
      setAssignments(Object.fromEntries(pairs));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pendingAssignment = useMemo(
    () => requests
      .filter((r) => r.status === 'Approved')
      .sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (b.isOverdue && !a.isOverdue) return 1;
        if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
        if (b.priority === 'Urgent' && a.priority !== 'Urgent') return 1;
        return new Date(a.travelDate) - new Date(b.travelDate);
      }),
    [requests],
  );

  const activeTrips = useMemo(
    () => requests.filter((r) => r.status === 'Vehicle Assigned'),
    [requests],
  );

  const busyDriverIds = useMemo(() => {
    const ids = new Set();
    for (const r of activeTrips) {
      const driverId = assignments[r._id]?.driver?._id;
      if (driverId) ids.add(String(driverId));
    }
    return ids;
  }, [activeTrips, assignments]);

  const readyDrivers = useMemo(
    () => drivers.filter(
      (d) =>
        d.isActive &&
        new Date(d.licenseExpiry) >= new Date() &&
        !busyDriverIds.has(String(d._id)),
    ),
    [drivers, busyDriverIds],
  );

  const sortedVehicles = useMemo(
    () => [...vehicles].sort((a, b) => {
      const rank = (s) => (s === 'Available' ? 0 : s === 'Assigned' ? 1 : 2);
      return rank(a.status) - rank(b.status) || a.vehicleId.localeCompare(b.vehicleId);
    }),
    [vehicles],
  );

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('coordinator-pending-count', {
      detail: stats?.awaitingAssignment ?? pendingAssignment.length,
    }));
  }, [stats, pendingAssignment.length]);

  if (loading) {
    return <div className="empty-state">Loading…</div>;
  }

  return (
    <div className="coordinator-dashboard">
      {error && <div className="error-banner">{error}</div>}

      <div className="coordinator-summary-mobile">
        <div className="coordinator-stat">
          <span className="coordinator-stat-value">{pendingAssignment.length}</span>
          <span className="coordinator-stat-label">Pending</span>
        </div>
        <div className="coordinator-stat">
          <span className="coordinator-stat-value">{activeTrips.length}</span>
          <span className="coordinator-stat-label">Active</span>
        </div>
        <div className="coordinator-stat">
          <span className="coordinator-stat-value">{readyDrivers.length}</span>
          <span className="coordinator-stat-label">Ready Drivers</span>
        </div>
        <div className="coordinator-stat">
          <span className="coordinator-stat-value">{sortedVehicles.filter((v) => v.status === 'Available').length}</span>
          <span className="coordinator-stat-label">Available Vehicles</span>
        </div>
      </div>

      <div className="coordinator-grid">
        <section className="coordinator-panel">
          <div className="panel-header">
            <h2>
              Assignment Queue
              {pendingAssignment.length > 0 && (
                <span className="panel-badge">{pendingAssignment.length} Pending</span>
              )}
            </h2>
          </div>
          <div className="panel-body queue-cards">
            {pendingAssignment.length === 0 ? (
              <div className="panel-empty">No approved requests awaiting assignment.</div>
            ) : (
              pendingAssignment.map((r) => <AssignmentQueueCard key={r._id} request={r} />)
            )}
          </div>
        </section>

        <section className="coordinator-panel">
          <div className="panel-header">
            <h2>Available Vehicles</h2>
            <Link to="/vehicles" className="panel-add" title="Manage vehicles">+</Link>
          </div>
          <div className="panel-body fleet-list">
            {sortedVehicles.length === 0 ? (
              <div className="panel-empty">No vehicles registered.</div>
            ) : (
              sortedVehicles.map((v) => <VehicleListItem key={v._id} vehicle={v} />)
            )}
          </div>
        </section>

        <section className="coordinator-panel">
          <div className="panel-header">
            <h2>Active Assignments</h2>
            <Link to="/reports" className="panel-link">View All</Link>
          </div>
          <div className="panel-body table-scroll">
            {activeTrips.length === 0 ? (
              <div className="panel-empty">No trips in progress.</div>
            ) : (
              <table className="active-table responsive-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Vehicle / Driver</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTrips.map((r) => {
                    const a = assignments[r._id];
                    return (
                      <tr key={r._id}>
                        <td className="req-id" data-label="Request">{r.requestNumber}</td>
                        <td data-label="Vehicle / Driver">
                          {a?.vehicle?.vehicleId || a?.vehicle?.plateNumber || '—'}
                          {a?.driver?.driverName ? `, ${a.driver.driverName}` : ''}
                        </td>
                        <td data-label="Status">
                          <span className="in-transit-badge">🚐 In Transit</span>
                        </td>
                        <td data-label="Action">
                          <Link to={`/requests/${r._id}`} className="btn-link">Manage</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="coordinator-panel">
          <div className="panel-header">
            <h2>Ready Drivers</h2>
            <Link to="/drivers" className="panel-add" title="Manage drivers">+</Link>
          </div>
          <div className="panel-body fleet-list">
            {readyDrivers.length === 0 ? (
              <div className="panel-empty">No drivers available right now.</div>
            ) : (
              readyDrivers.map((d) => <DriverListItem key={d._id} driver={d} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
