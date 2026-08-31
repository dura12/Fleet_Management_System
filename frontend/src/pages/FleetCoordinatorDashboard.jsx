import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useRequestUi } from '../context/RequestUiContext';
import DashboardFilters, { FilterSelect, filterDrivers, filterRequests, filterVehicles } from '../components/DashboardFilters';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { readCache, writeCache } from '../utils/sessionCache';
import { formatDateRange, getTripPhase } from '../utils/requestForm';
import ConfirmDialog from '../components/ConfirmDialog';
import { useErrorAlert } from '../context/ErrorContext';

function AssignmentQueueCard({ request, onOpen }) {
  const overdue = request.isOverdue;
  const urgent = request.priority === 'Urgent';

  return (
    <button
      type="button"
      className={`queue-card ${overdue ? 'queue-card-overdue' : ''}`}
      onClick={() => onOpen(request._id)}
    >
      <div className="queue-card-top">
        <span className="queue-card-id">{request.requestNumber}</span>
        {overdue && <span className="queue-overdue-tag">Overdue</span>}
        {!overdue && urgent && <span className="queue-urgent-tag">Urgent</span>}
      </div>
      <div className="queue-card-requester">{request.requester?.fullName || '—'}</div>
      <div className="queue-card-meta">
        <span>{request.numberOfPassengers} Passenger{request.numberOfPassengers !== 1 ? 's' : ''}</span>
        <span className="queue-card-dot">·</span>
        <span>{formatDateRange(request.travelDate, request.returnDate)}</span>
      </div>
      <div className="queue-card-destination">{request.destination}</div>
      <span className="queue-card-action">Assign →</span>
    </button>
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
  const { openDetail, refreshKey, notifyChanged } = useRequestUi();
  const cached = readCache('fleet-dashboard');
  const [requests, setRequests] = useState(cached?.requests ?? null);
  const [vehicles, setVehicles] = useState(cached?.vehicles ?? null);
  const [drivers, setDrivers] = useState(cached?.drivers ?? null);
  const [assignments, setAssignments] = useState(cached?.assignments ?? {});
  const [stats, setStats] = useState(cached?.stats ?? null);
  const { showError } = useErrorAlert();
  const loading = requests === null;
  const [search, setSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('Available');
  const [driverFilter, setDriverFilter] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const load = useCallback(async () => {
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
      const assignmentMap = Object.fromEntries(pairs);
      setAssignments(assignmentMap);
      writeCache('fleet-dashboard', {
        requests: reqData,
        vehicles: vehicleData,
        drivers: driverData,
        stats: queueStats,
        assignments: assignmentMap,
      });
    } catch (err) {
      showError(err);
      setRequests((prev) => prev ?? []);
      setVehicles((prev) => prev ?? []);
      setDrivers((prev) => prev ?? []);
    }
  }, [showError]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const pendingAssignment = useMemo(
    () => (requests ?? [])
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
    () => (requests ?? []).filter((r) => r.status === 'Vehicle Assigned'),
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
    () => (drivers ?? []).filter(
      (d) =>
        d.isActive &&
        new Date(d.licenseExpiry) >= new Date() &&
        !busyDriverIds.has(String(d._id)),
    ),
    [drivers, busyDriverIds],
  );

  const sortedVehicles = useMemo(
    () => [...(vehicles ?? [])].sort((a, b) => {
      const rank = (s) => (s === 'Available' ? 0 : s === 'Assigned' ? 1 : 2);
      return rank(a.status) - rank(b.status) || a.vehicleId.localeCompare(b.vehicleId);
    }),
    [vehicles],
  );

  const filteredPending = useMemo(
    () => filterRequests(pendingAssignment, { search, priority: queueFilter }),
    [pendingAssignment, search, queueFilter],
  );

  const filteredActiveTrips = useMemo(
    () => filterRequests(activeTrips, { search }),
    [activeTrips, search],
  );

  const filteredVehicles = useMemo(
    () => filterVehicles(sortedVehicles, { search, status: vehicleFilter }),
    [sortedVehicles, search, vehicleFilter],
  );

  const filteredReadyDrivers = useMemo(
    () => filterDrivers(readyDrivers, { search, status: driverFilter }),
    [readyDrivers, search, driverFilter],
  );

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('coordinator-pending-count', {
      detail: stats?.awaitingAssignment ?? pendingAssignment.length,
    }));
  }, [stats, pendingAssignment.length]);

  const handleCancelTrip = async () => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try {
      await api.cancelRequest(cancelTarget._id);
      setCancelTarget(null);
      notifyChanged();
      await load();
    } catch (err) {
      showError(err);
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <div className="coordinator-dashboard">

      <DashboardFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search requests, vehicles, drivers…"
      >
        <FilterSelect
          label="Queue"
          value={queueFilter}
          onChange={setQueueFilter}
          options={[
            { value: '', label: 'All priorities' },
            { value: 'urgent', label: 'Urgent only' },
            { value: 'overdue', label: 'Overdue only' },
          ]}
        />
        <FilterSelect
          label="Vehicle status"
          value={vehicleFilter}
          onChange={setVehicleFilter}
          options={[
            { value: '', label: 'All vehicles' },
            { value: 'Available', label: 'Available' },
            { value: 'Assigned', label: 'Assigned' },
            { value: 'Under Maintenance', label: 'Under Maintenance' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
        />
        <FilterSelect
          label="Driver status"
          value={driverFilter}
          onChange={setDriverFilter}
          options={[
            { value: '', label: 'All ready drivers' },
            { value: 'active', label: 'Active license' },
            { value: 'expired', label: 'Expired license' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </DashboardFilters>

      <div className="coordinator-summary-mobile">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="coordinator-stat coordinator-stat-skeleton">
                <span className="skel-bar skel-bar-stat-value" />
                <span className="skel-bar skel-bar-stat-label" />
              </div>
            ))}
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton variant="coordinator-grid" />
      ) : (
      <div className="coordinator-grid">
        <section className="coordinator-panel">
          <div className="panel-header">
            <h2>
              Assignment Queue
              {filteredPending.length > 0 && (
                <span className="panel-badge">{filteredPending.length} Pending</span>
              )}
            </h2>
          </div>
          <div className="panel-body queue-cards">
            {filteredPending.length === 0 ? (
              <div className="panel-empty">No approved requests match your filters.</div>
            ) : (
              filteredPending.map((r) => <AssignmentQueueCard key={r._id} request={r} onOpen={openDetail} />)
            )}
          </div>
        </section>

        <section className="coordinator-panel">
          <div className="panel-header">
            <h2>Available Vehicles</h2>
            <Link to="/vehicles" className="panel-add" title="Manage vehicles">+</Link>
          </div>
          <div className="panel-body fleet-list">
            {filteredVehicles.length === 0 ? (
              <div className="panel-empty">No vehicles match your filters.</div>
            ) : (
              filteredVehicles.map((v) => <VehicleListItem key={v._id} vehicle={v} />)
            )}
          </div>
        </section>

        <section className="coordinator-panel">
          <div className="panel-header">
            <h2>Active Assignments</h2>
            <Link to="/reports" className="panel-link">View All</Link>
          </div>
          <div className="panel-body table-scroll">
            {filteredActiveTrips.length === 0 ? (
              <div className="panel-empty">No active trips match your search.</div>
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
                  {filteredActiveTrips.map((r) => {
                    const a = assignments[r._id];
                    const phase = getTripPhase(r.travelDate);
                    return (
                      <tr key={r._id}>
                        <td className="req-id" data-label="Request">{r.requestNumber}</td>
                        <td data-label="Vehicle / Driver">
                          {a?.vehicle?.vehicleId || a?.vehicle?.plateNumber || '—'}
                          {a?.driver?.driverName ? `, ${a.driver.driverName}` : ''}
                        </td>
                        <td data-label="Status">
                          {phase === 'scheduled' ? (
                            <span className="scheduled-badge">Scheduled</span>
                          ) : (
                            <span className="in-transit-badge">🚐 In Transit</span>
                          )}
                        </td>
                        <td data-label="Action">
                          <button type="button" className="btn-link" onClick={() => openDetail(r._id)}>Manage</button>
                          {phase === 'scheduled' && (
                            <>
                              {' · '}
                              <button
                                type="button"
                                className="btn-link"
                                onClick={() => setCancelTarget(r)}
                              >
                                Cancel
                              </button>
                            </>
                          )}
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
            {filteredReadyDrivers.length === 0 ? (
              <div className="panel-empty">No drivers match your filters.</div>
            ) : (
              filteredReadyDrivers.map((d) => <DriverListItem key={d._id} driver={d} />)
            )}
          </div>
        </section>
      </div>
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Cancel this trip?"
          message={`Cancel ${cancelTarget.requestNumber} and release the assigned vehicle? The trip will not be marked as completed.`}
          confirmLabel="Yes, cancel trip"
          danger
          busy={cancelBusy}
          onCancel={() => setCancelTarget(null)}
          onConfirm={handleCancelTrip}
        />
      )}
    </div>
  );
}
