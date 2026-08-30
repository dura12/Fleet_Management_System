import { Fragment, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import EmployeeStatusBadge from '../components/EmployeeStatusBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useRequestUi } from '../context/RequestUiContext';
import { readCache, writeCache } from '../utils/sessionCache';
import { formatTripSummary } from '../utils/requestForm';

const PAGE_SIZE = 5;

const TABS = [
  { key: 'all', label: 'All Requests' },
  { key: 'drafts', label: 'Drafts', statuses: ['Draft'] },
  { key: 'pending', label: 'Pending', statuses: ['Submitted', 'Approved'] },
  { key: 'assigned', label: 'Assigned', statuses: ['Vehicle Assigned'] },
];

function formatTravelDate(travelDate, returnDate, tripDuration) {
  return formatTripSummary({ travelDate, returnDate, tripDuration });
}

export default function EmployeeRequests() {
  const { openCreate, openDetail, refreshKey } = useRequestUi();
  const [requests, setRequests] = useState(() => readCache('employee-requests'));
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [navSearch, setNavSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [assignments, setAssignments] = useState({});

  const loading = requests === null;

  useEffect(() => {
    let cancelled = false;
    setError('');
    api.getRequests()
      .then((data) => {
        if (!cancelled) {
          setRequests(data);
          writeCache('employee-requests', data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setRequests((prev) => prev ?? []);
        }
      });
    return () => { cancelled = true; };
  }, [refreshKey]);

  useEffect(() => {
    const onNavSearch = (e) => setNavSearch(e.detail || '');
    window.addEventListener('employee-nav-search', onNavSearch);
    return () => window.removeEventListener('employee-nav-search', onNavSearch);
  }, []);

  const filtered = useMemo(() => {
    const list = requests ?? [];
    const activeTab = TABS.find((t) => t.key === tab);
    const q = (search || navSearch).trim().toLowerCase();
    return list.filter((r) => {
      if (activeTab?.statuses && !activeTab.statuses.includes(r.status)) return false;
      if (!q) return true;
      return (
        r.requestNumber?.toLowerCase().includes(q) ||
        r.destination?.toLowerCase().includes(q)
      );
    });
  }, [requests, tab, search, navSearch]);

  useEffect(() => { setPage(1); }, [tab, search, navSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  const toggleExpand = async (request) => {
    const canExpand = ['Vehicle Assigned', 'Completed'].includes(request.status);
    if (!canExpand) {
      return;
    }
    if (expandedId === request._id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(request._id);
    if (assignments[request._id] !== undefined) return;

    try {
      const data = await api.getRequestAssignment(request._id);
      setAssignments((prev) => ({ ...prev, [request._id]: data }));
    } catch {
      setAssignments((prev) => ({ ...prev, [request._id]: null }));
    }
  };

  return (
    <div className="employee-dashboard">
      <div className="employee-page-header">
        <div>
          <h1>My Vehicle Requests</h1>
          <p className="subtitle">Manage and track your travel requisitions.</p>
        </div>
        <button type="button" className="btn btn-new-request" onClick={openCreate}>+ New Request</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="employee-toolbar">
        <div className="filter-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`filter-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="table-search">
          <input
            type="search"
            placeholder="Search destination or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="employee-table-card">
        {loading ? (
          <LoadingSkeleton variant="employee-table" />
        ) : filtered.length === 0 ? (
          <div className="empty-state">No requests found.</div>
        ) : (
          <>
            <table className="employee-table responsive-table">
              <thead>
                <tr>
                  <th className="col-expand" aria-label="Expand" />
                  <th>Req ID</th>
                  <th>Destination</th>
                  <th>Travel Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => {
                  const expandable = ['Vehicle Assigned', 'Completed'].includes(r.status);
                  const isExpanded = expandedId === r._id;
                  const assignment = assignments[r._id];

                  return (
                    <Fragment key={r._id}>
                      <tr
                        className={`employee-row ${isExpanded ? 'expanded' : ''} ${expandable ? 'expandable' : ''}`}
                        onClick={() => expandable && toggleExpand(r)}
                      >
                        <td className="col-expand" data-label="">
                          {expandable && (
                            <span className={`row-chevron ${isExpanded ? 'open' : ''}`} aria-hidden>›</span>
                          )}
                        </td>
                        <td className="req-id" data-label="Req ID">{r.requestNumber}</td>
                        <td data-label="Destination">{r.destination}</td>
                        <td data-label="Travel Date">{formatTravelDate(r.travelDate, r.returnDate, r.tripDuration)}</td>
                        <td data-label="Status"><EmployeeStatusBadge status={r.status} /></td>
                        <td className="actions" data-label="Actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn-link"
                            onClick={() => openDetail(r._id)}
                          >
                            {r.status === 'Draft' ? 'Edit' : 'View'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="employee-detail-row">
                          <td colSpan={6}>
                            {assignment === undefined ? (
                              <LoadingSkeleton variant="assignment-panels" />
                            ) : assignment ? (
                              <div className="assignment-panels">
                                <div className="assignment-panel">
                                  <div className="panel-icon driver-icon" aria-hidden>👤</div>
                                  <div>
                                    <div className="panel-label">Assignment Details</div>
                                    <div className="panel-title">{assignment.driver?.driverName || '—'}</div>
                                    <div className="panel-meta">Driver · {assignment.driver?.licenseNumber || '—'}</div>
                                  </div>
                                </div>
                                <div className="assignment-panel">
                                  <div className="panel-icon vehicle-icon" aria-hidden>🚐</div>
                                  <div>
                                    <div className="panel-label">Vehicle Information</div>
                                    <div className="panel-title">{assignment.vehicle?.model || '—'}</div>
                                    <div className="panel-meta">
                                      {assignment.vehicle?.plateNumber || '—'}
                                      {assignment.vehicle?.seatingCapacity != null && (
                                        <> · {assignment.vehicle.seatingCapacity} seats</>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="detail-empty">No assignment details available.</div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            <div className="table-footer">
              <span>Showing {rangeStart} to {rangeEnd} of {filtered.length} requests</span>
              <div className="pagination">
                <button
                  type="button"
                  className="page-btn"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="page-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
