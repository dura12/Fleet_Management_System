import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { readCache, writeCache } from '../utils/sessionCache';
import { formatDateRange, formatTripDuration } from '../utils/requestForm';
import {
  buildAssignmentHistoryExport,
  buildRequestsByStatusExport,
  buildVehicleRegisterExport,
  downloadCsv,
} from '../utils/exportCsv';

const TABS = [
  { key: 'vehicle-register', label: 'Vehicle Register', shortLabel: 'Vehicles' },
  { key: 'requests-by-status', label: 'Requests by Status', shortLabel: 'Requests' },
  { key: 'assignment-history', label: 'Assignment History', shortLabel: 'History' },
];

const FETCHERS = {
  'vehicle-register': api.vehicleRegister,
  'requests-by-status': api.requestsByStatus,
  'assignment-history': api.assignmentHistory,
};

export default function Reports({ embedded = false }) {
  const [tab, setTab] = useState('vehicle-register');
  const [cache, setCache] = useState(() => readCache('reports', {}));
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const data = cache[tab];

  useEffect(() => {
    if (cacheRef.current[tab] != null) return undefined;

    let cancelled = false;
    setError('');

    FETCHERS[tab]()
      .then((result) => {
        if (!cancelled) {
          setCache((prev) => {
            const next = { ...prev, [tab]: result };
            writeCache('reports', next);
            return next;
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => { cancelled = true; };
  }, [tab]);

  const downloadReport = useCallback(async () => {
    setDownloading(true);
    setError('');
    try {
      let reportData = cacheRef.current[tab];
      if (!reportData) {
        reportData = await FETCHERS[tab]();
        setCache((prev) => ({ ...prev, [tab]: reportData }));
      }

      let sections;
      let filename;
      if (tab === 'vehicle-register') {
        sections = buildVehicleRegisterExport(reportData);
        filename = 'vehicle-register.csv';
      } else if (tab === 'requests-by-status') {
        sections = buildRequestsByStatusExport(reportData);
        filename = 'requests-by-status.csv';
      } else {
        sections = buildAssignmentHistoryExport(reportData);
        filename = 'assignment-history.csv';
      }

      downloadCsv(filename, sections);
    } catch (err) {
      setError(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  }, [tab]);

  const activeTab = TABS.find((t) => t.key === tab);

  return (
    <div className={embedded ? 'reports-embedded' : 'reports-page'}>
      {!embedded && (
        <div className="page-header">
          <div>
            <h1>Reports</h1>
            <p className="subtitle">Fleet reports available on demand.</p>
          </div>
        </div>
      )}

      <div className="reports-toolbar">
        <div className="reports-tabs filters">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`btn reports-tab-btn ${tab === t.key ? '' : 'secondary'}`}
              onClick={() => setTab(t.key)}
            >
              <span className="reports-tab-long">{t.label}</span>
              <span className="reports-tab-short">{t.shortLabel}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn secondary reports-download-btn"
          disabled={downloading}
          onClick={downloadReport}
        >
          {downloading ? 'Downloading…' : 'Download CSV'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card reports-card">
        {!embedded && activeTab && (
          <h2 className="reports-card-title">{activeTab.label}</h2>
        )}
        {tab === 'vehicle-register' ? (
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
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="empty-state">No vehicles found.</div>;
  }
  return (
    <div className="table-scroll">
      <table className="responsive-table">
        <thead><tr><th>Vehicle ID</th><th>Plate</th><th>Model</th><th>Type</th><th>Seats</th><th>Mileage</th><th>Status</th></tr></thead>
        <tbody>
          {data.map((v) => (
            <tr key={v._id}>
              <td data-label="Vehicle ID">{v.vehicleId}</td>
              <td data-label="Plate">{v.plateNumber}</td>
              <td data-label="Model">{v.model}</td>
              <td data-label="Type">{v.vehicleType}</td>
              <td data-label="Seats">{v.seatingCapacity ?? '—'}</td>
              <td data-label="Mileage">{(v.currentMileage ?? 0).toLocaleString()}</td>
              <td data-label="Status"><StatusBadge status={v.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestsByStatusTable({ data }) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return <div className="empty-state">No requests found.</div>;
  }

  const groups = Object.entries(data).filter(([, items]) => {
    const list = Array.isArray(items) ? items : items ? [items] : [];
    return list.length > 0;
  });

  if (groups.length === 0) {
    return <div className="empty-state">No requests found.</div>;
  }

  return (
    <div className="reports-status-groups">
      {groups.map(([status, items]) => {
        const requests = Array.isArray(items) ? items : [items];
        return (
          <div key={status} className="reports-status-group">
            <h2 className="reports-group-title">
              <StatusBadge status={status} />
              <span className="reports-group-count"> ({requests.length})</span>
            </h2>
            <div className="table-scroll">
              <table className="responsive-table">
                <thead><tr><th>Request #</th><th>Requester</th><th>Branch</th><th>Destination</th><th>Duration</th><th>Dates</th><th>Priority</th></tr></thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r._id}>
                      <td data-label="Request #">{r.requestNumber}</td>
                      <td data-label="Requester">{r.requester?.fullName}</td>
                      <td data-label="Branch">{r.branch || '—'}</td>
                      <td data-label="Destination">{r.destination}</td>
                      <td data-label="Duration">{formatTripDuration(r.tripDuration)}</td>
                      <td data-label="Dates">{formatDateRange(r.travelDate, r.returnDate)}</td>
                      <td data-label="Priority">{r.priority === 'Urgent' ? <span className="badge Urgent">Urgent</span> : 'Normal'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AssignmentHistoryTable({ data }) {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="empty-state">No assignments found.</div>;
  }
  return (
    <div className="table-scroll">
      <table className="responsive-table">
        <thead>
          <tr><th>Assignment #</th><th>Request #</th><th>Requester</th><th>Vehicle</th><th>Driver</th><th>Assigned</th><th>Returned</th></tr>
        </thead>
        <tbody>
          {data.map((a) => (
            <tr key={a._id}>
              <td data-label="Assignment #">{a.assignmentId}</td>
              <td data-label="Request #">{a.request?.requestNumber}</td>
              <td data-label="Requester">{a.request?.requester?.fullName}</td>
              <td data-label="Vehicle">{a.vehicle?.plateNumber} ({a.vehicle?.model})</td>
              <td data-label="Driver">{a.driver?.driverName}</td>
              <td data-label="Assigned">{new Date(a.assignmentDate).toLocaleDateString()}</td>
              <td data-label="Returned">{a.returnedAt ? new Date(a.returnedAt).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
