import { useCallback, useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { api } from '../api/client';

import Reports from './Reports';

import { useRequestUi } from '../context/RequestUiContext';

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



function ApprovalQueue({ requests, stats, vehicles, onRefresh }) {

  const { openDetail } = useRequestUi();

  const [search, setSearch] = useState('');

  const [busyId, setBusyId] = useState(null);

  const [error, setError] = useState('');

  const [message, setMessage] = useState('');



  const submitted = useMemo(

    () => requests.filter((r) => r.status === 'Submitted'),

    [requests],

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

  }, [submitted, urgent, search]);



  const activeVehicles = vehicles.filter((v) => v.status === 'Assigned' || v.status === 'Available').length;

  const totalMileage = vehicles.reduce((sum, v) => sum + (v.currentMileage || 0), 0);



  const runDecision = async (id, action) => {

    setError('');

    setMessage('');

    setBusyId(id);

    try {

      if (action === 'approve') {

        await api.approveRequest(id);

        setMessage('Request approved.');

      } else {

        await api.rejectRequest(id, 'Rejected from manager dashboard');

        setMessage('Request rejected.');

      }

      await onRefresh();

    } catch (err) {

      setError(err.message);

    } finally {

      setBusyId(null);

    }

  };



  return (

    <div className="manager-approval-view">

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

            <div className="metric-value">{activeVehicles} <span className="metric-sub">/ {vehicles.length} total fleet</span></div>

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



      {error && <div className="error-banner">{error}</div>}

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

              {urgent.requester?.fullName} ({urgent.requester?.department}) · {urgent.destination} · {formatTravelDateTime(urgent.travelDate)}

            </p>

          </div>

          <div className="urgent-actions">

            <button

              type="button"

              className="btn btn-outline"

              disabled={busyId === urgent._id}

              onClick={() => runDecision(urgent._id, 'reject')}

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

        <div className="standard-queue-tools">

          <input

            type="search"

            placeholder="Search requests..."

            value={search}

            onChange={(e) => setSearch(e.target.value)}

          />

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

                  <td data-label="Travel Date">{formatDate(r.travelDate)}</td>

                  <td data-label="Purpose">{r.purpose}</td>

                  <td className="actions manager-row-actions" data-label="Actions">

                    <button

                      type="button"

                      className="btn btn-sm btn-outline"

                      disabled={busyId === r._id}

                      onClick={() => runDecision(r._id, 'reject')}

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

    </div>

  );

}



function ReadOnlyFleet({ vehicles }) {

  return (

    <div className="manager-table-card table-scroll">

      {vehicles.length === 0 ? (

        <div className="empty-state">No vehicles found.</div>

      ) : (

        <table className="manager-table responsive-table">

          <thead>

            <tr>

              <th>Vehicle ID</th><th>Plate</th><th>Model</th><th>Type</th><th>Seats</th><th>Mileage</th><th>Status</th>

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

                <td data-label="Mileage">{(v.currentMileage ?? 0).toLocaleString()}</td>

                <td data-label="Status">{v.status}</td>

              </tr>

            ))}

          </tbody>

        </table>

      )}

    </div>

  );

}



function ReadOnlyDrivers({ drivers }) {

  return (

    <div className="manager-table-card table-scroll">

      {drivers.length === 0 ? (

        <div className="empty-state">No drivers found.</div>

      ) : (

        <table className="manager-table responsive-table">

          <thead>

            <tr>

              <th>Driver ID</th><th>Name</th><th>License #</th><th>License Expiry</th><th>Status</th>

            </tr>

          </thead>

          <tbody>

            {drivers.map((d) => (

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

  );

}



export default function ManagerDashboard() {

  const { refreshKey } = useRequestUi();

  const [tab, setTab] = useState('approval');

  const [requests, setRequests] = useState([]);

  const [stats, setStats] = useState(null);

  const [vehicles, setVehicles] = useState([]);

  const [drivers, setDrivers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [exporting, setExporting] = useState(false);

  const [error, setError] = useState('');



  const load = useCallback(async () => {

    setError('');

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

    } catch (err) {

      setError(err.message);

    } finally {

      setLoading(false);

    }

  }, [refreshKey]);



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

    setError('');

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

      setError(err.message || 'Export failed');

    } finally {

      setExporting(false);

    }

  }, []);



  useEffect(() => {

    const handler = () => { exportFullReport(); };

    window.addEventListener('manager-export-data', handler);

    return () => window.removeEventListener('manager-export-data', handler);

  }, [exportFullReport]);



  const criticalCount = (stats?.overdueSubmitted ?? 0) +

    requests.filter((r) => r.status === 'Submitted' && r.priority === 'Urgent').length;



  useEffect(() => {

    window.dispatchEvent(new CustomEvent('manager-critical-count', { detail: criticalCount }));

  }, [criticalCount]);



  return (

    <div className="manager-dashboard">

      <div className="manager-dash-top">

        <button

          type="button"

          className="btn btn-export manager-dash-export"

          disabled={exporting || loading}

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



      {error && <div className="error-banner">{error}</div>}



      <div className="manager-dash-body">

        {loading ? (

          <div className="empty-state">Loading…</div>

        ) : tab === 'approval' ? (

          <ApprovalQueue requests={requests} stats={stats} vehicles={vehicles} onRefresh={load} />

        ) : tab === 'fleet' ? (

          <ReadOnlyFleet vehicles={vehicles} />

        ) : tab === 'drivers' ? (

          <ReadOnlyDrivers drivers={drivers} />

        ) : (

          <div className="manager-reports-embed">

            <Reports embedded />

          </div>

        )}

      </div>

    </div>

  );

}


