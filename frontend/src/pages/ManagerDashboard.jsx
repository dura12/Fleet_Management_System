import { useCallback, useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { api } from '../api/client';

import Reports from './Reports';

import { useRequestUi } from '../context/RequestUiContext';

import ConfirmDialog from '../components/ConfirmDialog';
import DashboardFilters, { FilterSelect, filterDrivers, filterVehicles } from '../components/DashboardFilters';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { readCache, writeCache } from '../utils/sessionCache';
import { useErrorAlert } from '../context/ErrorContext';
import { formatDateRange } from '../utils/requestForm';

import {

  buildManagerExportSections,

  downloadCsv,

} from '../utils/exportCsv';



const DASH_TABS = [

  { key: 'approval', label: 'Approval Queue', shortLabel: 'Approvals' },

  { key: 'fleet', label: 'Fleet Directory', shortLabel: 'Fleet' },

  { key: 'drivers', label: 'Driver Directory', shortLabel: 'Drivers' },

  { key: 'reports', label: 'Reports', shortLabel: 'Reports' },

];



function formatDate(dateStr) {

  return new Date(dateStr).toLocaleDateString('en-US', {

    month: 'short',

    day: 'numeric',

    year: 'numeric',

  });

}



function formatTravelDateTime(dateStr) {

  const d = new Date(dateStr);

  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const isToday = new Date().toDateString() === d.toDateString();

  if (isToday) return `Today, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  return date;

}



function formatMileage(total) {

  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`;

  return String(total);

}



function ApprovalQueue({ requests, stats, vehicles, onRefresh, loading }) {

  const { showError } = useErrorAlert();

  const { openDetail } = useRequestUi();

  const safeRequests = requests ?? [];

  const safeVehicles = vehicles ?? [];

  const [search, setSearch] = useState('');

  const [queueFilter, setQueueFilter] = useState('');

  const [busyId, setBusyId] = useState(null);

  const [message, setMessage] = useState('');

  const [confirmReject, setConfirmReject] = useState(null);



  const submitted = useMemo(

    () => safeRequests.filter((r) => r.status === 'Submitted'),

    [safeRequests],

  );



  const urgent = useMemo(() => {

    const list = submitted.filter((r) => r.priority === 'Urgent' || r.isOverdue);

    return list.sort((a, b) => {

      if (a.isOverdue && !b.isOverdue) return -1;

      if (b.isOverdue && !a.isOverdue) return 1;

      if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;

      if (b.priority === 'Urgent' && a.priority !== 'Urgent') return 1;

      return new Date(a.submittedAt || a.createdAt) - new Date(b.submittedAt || b.createdAt);

    })[0] || null;

  }, [submitted]);



  const standardQueue = useMemo(() => {

    const q = search.trim().toLowerCase();

    return submitted

      .filter((r) => r._id !== urgent?._id)

      .filter((r) => {

        if (queueFilter === 'urgent' && r.priority !== 'Urgent') return false;

        if (queueFilter === 'overdue' && !r.isOverdue) return false;

        if (!q) return true;

        return (

          r.requestNumber?.toLowerCase().includes(q) ||

          r.requester?.fullName?.toLowerCase().includes(q) ||

          r.destination?.toLowerCase().includes(q) ||

          r.purpose?.toLowerCase().includes(q)

        );

      })

      .sort((a, b) => {

        if (a.isOverdue && !b.isOverdue) return -1;

        if (b.isOverdue && !a.isOverdue) return 1;

        if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;

        if (b.priority === 'Urgent' && a.priority !== 'Urgent') return 1;

        return new Date(a.submittedAt || a.createdAt) - new Date(b.submittedAt || b.createdAt);

      });

  }, [submitted, urgent, search, queueFilter]);



  const activeVehicles = safeVehicles.filter((v) => v.status === 'Assigned' || v.status === 'Available').length;

  const totalMileage = safeVehicles.reduce((sum, v) => sum + (v.currentMileage || 0), 0);



  const runDecision = async (id, action) => {

    setMessage('');

    setBusyId(id);

    try {

      if (action === 'approve') {

        await api.approveRequest(id);

        setMessage('Request approved.');

      } else {

        await api.rejectRequest(id, 'Rejected from manager dashboard');

        setMessage('Request rejected.');

        setConfirmReject(null);

      }

      await onRefresh();

    } catch (err) {

      showError(err);

    } finally {

      setBusyId(null);

    }

  };



  const askReject = (request) => {

    setConfirmReject({

      title: 'Reject this request?',

      message: `Reject ${request.requestNumber} from ${request.requester?.fullName || 'requester'}?`,

      requestId: request._id,

    });

  };



  return (

    <div className="manager-approval-view">

      {loading ? (
        <LoadingSkeleton variant="manager-approval" />
      ) : (
        <>

      <div className="manager-metrics">

        <div className="metric-card">

          <div className="metric-icon metric-icon-clipboard" aria-hidden>📋</div>

          <div>

            <div className="metric-label">Pending Approvals</div>

            <div className="metric-value">{stats?.submittedCount ?? submitted.length}</div>

            {(stats?.overdueSubmitted ?? 0) > 0 && (

              <div className="metric-delta urgent">{stats.overdueSubmitted} overdue</div>

            )}

          </div>

        </div>

        <div className="metric-card">

          <div className="metric-icon metric-icon-truck" aria-hidden>🚚</div>

          <div>

            <div className="metric-label">Active Vehicles</div>

            <div className="metric-value">{activeVehicles} <span className="metric-sub">/ {safeVehicles.length} total fleet</span></div>

          </div>

        </div>

        <div className="metric-card">

          <div className="metric-icon metric-icon-gauge" aria-hidden>⏱</div>

          <div>

            <div className="metric-label">Fleet Mileage</div>

            <div className="metric-value">{formatMileage(totalMileage)} <span className="metric-sub">miles logged</span></div>

          </div>

        </div>

      </div>



      {message && <div className="success-banner">{message}</div>}



      {urgent && (

        <div className="urgent-card">

          <div className="urgent-card-body">

            <div className="urgent-tags">

              <span className="urgent-tag">Urgent Request</span>

              <span className="urgent-id">{urgent.requestNumber}</span>

              {urgent.isOverdue && <span className="badge Overdue">Overdue</span>}

            </div>

            <h2 className="urgent-title">{urgent.purpose}</h2>

            <p className="urgent-meta">

              {urgent.requester?.fullName} ({urgent.requester?.department}) · {urgent.branch || '—'} · {urgent.destination} · {formatDateRange(urgent.travelDate, urgent.returnDate)}

            </p>

          </div>

          <div className="urgent-actions">

            <button

              type="button"

              className="btn btn-outline"

              disabled={busyId === urgent._id}

              onClick={() => askReject(urgent)}

            >

              Reject

            </button>

            <button

              type="button"

              className="btn btn-approve"

              disabled={busyId === urgent._id}

              onClick={() => runDecision(urgent._id, 'approve')}

            >

              ✓ Approve Transfer

            </button>

          </div>

        </div>

      )}



      <div className="standard-queue-header">

        <h2>Standard Queue</h2>

        <div className="standard-queue-tools filters">

          <input

            type="search"

            placeholder="Search requests..."

            value={search}

            onChange={(e) => setSearch(e.target.value)}

          />

          <select value={queueFilter} onChange={(e) => setQueueFilter(e.target.value)} aria-label="Filter queue">

            <option value="">All priorities</option>

            <option value="urgent">Urgent only</option>

            <option value="overdue">Overdue only</option>

          </select>

        </div>

      </div>



      <div className="manager-table-card table-scroll">

        {standardQueue.length === 0 ? (

          <div className="empty-state">No pending requests in the standard queue.</div>

        ) : (

          <table className="manager-table responsive-table">

            <thead>

              <tr>

                <th>ID</th>

                <th>Requester</th>

                <th>Destination</th>

                <th>Travel Date</th>

                <th>Purpose</th>

                <th>Actions</th>

              </tr>

            </thead>

            <tbody>

              {standardQueue.map((r) => (

                <tr key={r._id} className={r.isOverdue ? 'row-overdue' : ''}>

                  <td className="req-id" data-label="ID">

                    {r.requestNumber}

                    {r.priority === 'Urgent' && <span className="badge Urgent" style={{ marginLeft: '0.35rem' }}>Urgent</span>}

                  </td>

                  <td data-label="Requester">{r.requester?.fullName || '—'}</td>

                  <td data-label="Destination">{r.destination}</td>

                  <td data-label="Travel Date">{formatDateRange(r.travelDate, r.returnDate)}</td>

                  <td data-label="Purpose">{r.purpose}</td>

                  <td className="actions manager-row-actions" data-label="Actions">

                    <button

                      type="button"

                      className="btn btn-sm btn-outline"

                      disabled={busyId === r._id}

                      onClick={() => askReject(r)}

                    >

                      Reject

                    </button>

                    <button

                      type="button"

                      className="btn btn-sm btn-approve"

                      disabled={busyId === r._id}

                      onClick={() => runDecision(r._id, 'approve')}

                    >

                      Approve

                    </button>

                    <button type="button" className="btn-link" onClick={() => openDetail(r._id)}>View</button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        )}

      </div>

      {confirmReject && (
        <ConfirmDialog
          title={confirmReject.title}
          message={confirmReject.message}
          confirmLabel="Reject"
          danger
          busy={busyId === confirmReject.requestId}
          onCancel={() => setConfirmReject(null)}
          onConfirm={() => runDecision(confirmReject.requestId, 'reject')}
        />
      )}

        </>
      )}

    </div>

  );

}



function ReadOnlyFleet({ vehicles, loading }) {

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(
    () => filterVehicles(vehicles ?? [], { search, status: statusFilter }),
    [vehicles, search, statusFilter],
  );

  return (

    <>

      <DashboardFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search vehicles…"
      >
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'Available', label: 'Available' },
            { value: 'Assigned', label: 'Assigned' },
            { value: 'Under Maintenance', label: 'Under Maintenance' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
        />
      </DashboardFilters>

    <div className="manager-table-card table-scroll">

      {loading ? (
        <LoadingSkeleton variant="data-table" columns={7} rows={5} />
      ) : filtered.length === 0 ? (

        <div className="empty-state">No vehicles match your filters.</div>

      ) : (

        <table className="manager-table responsive-table">

          <thead>

            <tr>

              <th>Vehicle ID</th><th>Plate</th><th>Model</th><th>Type</th><th>Seats</th><th>Mileage</th><th>Status</th>

            </tr>

          </thead>

          <tbody>

            {filtered.map((v) => (

              <tr key={v._id}>

                <td data-label="Vehicle ID">{v.vehicleId}</td>

                <td data-label="Plate">{v.plateNumber}</td>

                <td data-label="Model">{v.model}</td>

                <td data-label="Type">{v.vehicleType}</td>

                <td data-label="Seats">{v.seatingCapacity ?? '—'}</td>

                <td data-label="Mileage">{(v.currentMileage ?? 0).toLocaleString()}</td>

                <td data-label="Status">{v.status}</td>

              </tr>

            ))}

          </tbody>

        </table>

      )}

    </div>

    </>

  );

}



function ReadOnlyDrivers({ drivers, loading }) {

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(
    () => filterDrivers(drivers ?? [], { search, status: statusFilter }),
    [drivers, search, statusFilter],
  );

  return (

    <>

      <DashboardFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search drivers…"
      >
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'All drivers' },
            { value: 'active', label: 'Active' },
            { value: 'expired', label: 'License expired' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </DashboardFilters>

    <div className="manager-table-card table-scroll">

      {loading ? (
        <LoadingSkeleton variant="data-table" columns={5} rows={5} />
      ) : filtered.length === 0 ? (

        <div className="empty-state">No drivers match your filters.</div>

      ) : (

        <table className="manager-table responsive-table">

          <thead>

            <tr>

              <th>Driver ID</th><th>Name</th><th>License #</th><th>License Expiry</th><th>Status</th>

            </tr>

          </thead>

          <tbody>

            {filtered.map((d) => (

              <tr key={d._id}>

                <td data-label="Driver ID">{d.driverId}</td>

                <td data-label="Name">{d.driverName}</td>

                <td data-label="License #">{d.licenseNumber}</td>

                <td data-label="License Expiry">{new Date(d.licenseExpiry).toLocaleDateString()}</td>

                <td data-label="Status">

                  {!d.isActive ? 'Inactive' : new Date(d.licenseExpiry) < new Date() ? 'Expired' : 'Active'}

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      )}

    </div>

    </>

  );

}



export default function ManagerDashboard() {

  const { showError } = useErrorAlert();

  const { refreshKey } = useRequestUi();

  const cached = readCache('manager-dashboard');

  const [tab, setTab] = useState('approval');

  const [requests, setRequests] = useState(cached?.requests ?? null);

  const [stats, setStats] = useState(cached?.stats ?? null);

  const [vehicles, setVehicles] = useState(cached?.vehicles ?? null);

  const [drivers, setDrivers] = useState(cached?.drivers ?? null);

  const loading = requests === null;

  const [exporting, setExporting] = useState(false);



  const load = useCallback(async () => {

    try {

      const [reqData, queueStats, vehicleData, driverData] = await Promise.all([

        api.getRequests(),

        api.getRequestStats(),

        api.getVehicles(),

        api.getDrivers(),

      ]);

      setRequests(reqData);

      setStats(queueStats);

      setVehicles(vehicleData);

      setDrivers(driverData);

      writeCache('manager-dashboard', {
        requests: reqData,
        stats: queueStats,
        vehicles: vehicleData,
        drivers: driverData,
      });

    } catch (err) {

      showError(err);

      setRequests((prev) => prev ?? []);

      setVehicles((prev) => prev ?? []);

      setDrivers((prev) => prev ?? []);

    }

  }, [refreshKey, showError]);



  useEffect(() => { load(); }, [load]);



  useEffect(() => {

    const onTab = (e) => {

      if (e.detail) setTab(e.detail);

    };

    window.addEventListener('manager-dash-tab', onTab);

    return () => window.removeEventListener('manager-dash-tab', onTab);

  }, []);



  const exportFullReport = useCallback(async () => {

    setExporting(true);

    try {

      const [reqData, vehicleData, driverData, assignmentData] = await Promise.all([

        api.getRequests(),

        api.getVehicles(),

        api.getDrivers(),

        api.assignmentHistory(),

      ]);

      const sections = buildManagerExportSections(reqData, vehicleData, driverData, assignmentData);

      const stamp = new Date().toISOString().slice(0, 10);

      downloadCsv(`fleet-management-report-${stamp}.csv`, sections);

    } catch (err) {

      showError(err);

    } finally {

      setExporting(false);

    }

  }, [showError]);



  useEffect(() => {

    const handler = () => { exportFullReport(); };

    window.addEventListener('manager-export-data', handler);

    return () => window.removeEventListener('manager-export-data', handler);

  }, [exportFullReport]);



  const criticalCount = (stats?.overdueSubmitted ?? 0) +

    (requests ?? []).filter((r) => r.status === 'Submitted' && r.priority === 'Urgent').length;



  useEffect(() => {

    window.dispatchEvent(new CustomEvent('manager-critical-count', { detail: criticalCount }));

  }, [criticalCount]);



  return (

    <div className="manager-dashboard">

      <div className="manager-dash-top">

        <button

          type="button"

          className="btn btn-export manager-dash-export"

          disabled={exporting}

          onClick={exportFullReport}

        >

          {exporting ? 'Exporting…' : 'Export Full Report'}

        </button>

      </div>



      <div className="manager-dash-tabs" role="tablist" aria-label="Manager sections">

        {DASH_TABS.map((t) => (

          <button

            key={t.key}

            type="button"

            role="tab"

            aria-selected={tab === t.key}

            className={`manager-dash-tab ${tab === t.key ? 'active' : ''}`}

            onClick={() => setTab(t.key)}

          >

            <span className="manager-tab-long">{t.label}</span>

            <span className="manager-tab-short">{t.shortLabel}</span>

          </button>

        ))}

      </div>



      <div className="manager-dash-body">

        <div hidden={tab !== 'approval'}>

          <ApprovalQueue requests={requests ?? []} stats={stats} vehicles={vehicles ?? []} onRefresh={load} loading={loading} />

        </div>

        <div hidden={tab !== 'fleet'}>

          <ReadOnlyFleet vehicles={vehicles ?? []} loading={loading} />

        </div>

        <div hidden={tab !== 'drivers'}>

          <ReadOnlyDrivers drivers={drivers ?? []} loading={loading} />

        </div>

        <div className="manager-reports-embed" hidden={tab !== 'reports'}>

          <Reports embedded />

        </div>

      </div>

    </div>

  );

}


