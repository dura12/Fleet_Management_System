const VARIANTS = {
  table: {
    emoji: '📋',
    title: 'Loading your list…',
    hint: 'Fetching the latest records',
    rows: 5,
  },
  cards: {
    emoji: '✨',
    title: 'Getting things ready…',
    hint: 'Pulling dashboard stats and queues',
    rows: 4,
  },
  detail: {
    emoji: '🔍',
    title: 'Opening details…',
    hint: 'Almost there',
    rows: 3,
  },
  reports: {
    emoji: '📊',
    title: 'Building report…',
    hint: 'Crunching fleet numbers',
    rows: 4,
  },
  notifications: {
    emoji: '🔔',
    title: 'Checking alerts…',
    hint: 'One moment',
    rows: 3,
  },
  'employee-table': {
    rows: 5,
  },
  'coordinator-grid': {},
  'manager-approval': {},
  'data-table': { rows: 5 },
  'admin-overview': {},
};

function PanelListSkeleton({ rows = 3 }) {
  return (
    <div className="panel-skeleton-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="panel-skeleton-list-item">
          <span className="skel-bar skel-bar-list-title" />
          <span className="skel-bar skel-bar-list-meta" />
        </div>
      ))}
    </div>
  );
}

function PanelQueueSkeleton({ rows = 3 }) {
  return (
    <div className="panel-skeleton-queue">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="panel-skeleton-queue-card">
          <span className="skel-bar skel-bar-queue-id" />
          <span className="skel-bar skel-bar-queue-title" />
          <span className="skel-bar skel-bar-queue-meta" />
        </div>
      ))}
    </div>
  );
}

function CoordinatorGridSkeleton() {
  return (
    <div className="coordinator-grid coordinator-grid-skeleton" role="status" aria-live="polite" aria-busy="true">
      <section className="coordinator-panel coordinator-panel-skeleton">
        <div className="panel-header"><span className="skel-bar skel-bar-panel-title" /></div>
        <div className="panel-body queue-cards"><PanelQueueSkeleton rows={3} /></div>
      </section>
      <section className="coordinator-panel coordinator-panel-skeleton">
        <div className="panel-header"><span className="skel-bar skel-bar-panel-title" /></div>
        <div className="panel-body fleet-list"><PanelListSkeleton rows={4} /></div>
      </section>
      <section className="coordinator-panel coordinator-panel-skeleton">
        <div className="panel-header"><span className="skel-bar skel-bar-panel-title" /></div>
        <div className="panel-body table-scroll"><DataTableSkeleton columns={4} rows={3} compact /></div>
      </section>
      <section className="coordinator-panel coordinator-panel-skeleton">
        <div className="panel-header"><span className="skel-bar skel-bar-panel-title" /></div>
        <div className="panel-body fleet-list"><PanelListSkeleton rows={4} /></div>
      </section>
    </div>
  );
}

function DataTableSkeleton({ columns = 6, rows = 5, compact = false, className = '' }) {
  return (
    <div className={`loading-skeleton data-table-skeleton ${compact ? 'data-table-skeleton-compact' : ''} ${className}`.trim()}>
      <table className="responsive-table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i}><span className="skel-bar skel-bar-th" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, ri) => (
            <tr key={ri} className="data-skeleton-row">
              {Array.from({ length: columns }).map((_, ci) => (
                <td key={ci}><span className="skel-bar skel-bar-td" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManagerApprovalSkeleton() {
  return (
    <div className="manager-approval-skeleton" role="status" aria-live="polite" aria-busy="true">
      <div className="manager-metrics">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="metric-card metric-card-skeleton">
            <span className="skel-bar skel-bar-metric-icon" />
            <div className="metric-card-skeleton-copy">
              <span className="skel-bar skel-bar-metric-label" />
              <span className="skel-bar skel-bar-metric-value" />
            </div>
          </div>
        ))}
      </div>
      <div className="manager-table-card table-scroll">
        <DataTableSkeleton columns={6} rows={4} />
      </div>
    </div>
  );
}

function AdminOverviewSkeleton() {
  return (
    <div className="admin-overview admin-overview-skeleton" role="status" aria-live="polite" aria-busy="true">
      <div className="admin-stat-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="admin-stat-card admin-stat-card-skeleton">
            <span className="skel-bar skel-bar-stat-value" />
            <span className="skel-bar skel-bar-stat-label" />
          </div>
        ))}
      </div>
      <div className="admin-role-breakdown card admin-role-skeleton">
        <span className="skel-bar skel-bar-role-title" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-role-skeleton-row">
            <span className="skel-bar skel-bar-role-label" />
            <span className="skel-bar skel-bar-role-count" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployeeTableSkeleton({ rows = 5 }) {
  return (
    <div className="loading-skeleton loading-skeleton-employee-table" role="status" aria-live="polite" aria-busy="true">
      <table className="employee-table responsive-table">
        <thead>
          <tr>
            <th className="col-expand" aria-hidden />
            <th>Req ID</th>
            <th>Destination</th>
            <th>Travel Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="employee-skeleton-row" style={{ animationDelay: `${i * 0.06}s` }}>
              <td className="col-expand"><span className="skel-bar skel-bar-xs" /></td>
              <td><span className="skel-bar skel-bar-sm" /></td>
              <td><span className="skel-bar skel-bar-lg" /></td>
              <td><span className="skel-bar skel-bar-md" /></td>
              <td><span className="skel-bar skel-bar-pill" /></td>
              <td><span className="skel-bar skel-bar-link" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="employee-skeleton-footer">
        <span className="skel-bar skel-bar-footer" />
        <span className="skel-bar skel-bar-pager" />
      </div>
    </div>
  );
}

function AssignmentPanelsSkeleton() {
  return (
    <div className="assignment-panels">
      {[0, 1].map((i) => (
        <div key={i} className="assignment-panel assignment-panel-skeleton">
          <span className="skel-bar skel-bar-icon" />
          <div className="assignment-panel-skeleton-copy">
            <span className="skel-bar skel-bar-label" />
            <span className="skel-bar skel-bar-title" />
            <span className="skel-bar skel-bar-meta" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LoadingSkeleton({ variant = 'table', message, columns, rows: rowsProp }) {
  if (variant === 'employee-table') {
    const cfg = VARIANTS['employee-table'];
    return <EmployeeTableSkeleton rows={cfg.rows} />;
  }

  if (variant === 'assignment-panels') {
    return <AssignmentPanelsSkeleton />;
  }

  if (variant === 'coordinator-grid') {
    return <CoordinatorGridSkeleton />;
  }

  if (variant === 'manager-approval') {
    return <ManagerApprovalSkeleton />;
  }

  if (variant === 'data-table') {
    const cfg = VARIANTS['data-table'];
    return <DataTableSkeleton columns={columns || 6} rows={rowsProp || cfg.rows} />;
  }

  if (variant === 'admin-overview') {
    return <AdminOverviewSkeleton />;
  }
  const cfg = VARIANTS[variant] || VARIANTS.table;
  const title = message || cfg.title;

  return (
    <div className={`loading-skeleton loading-skeleton-${variant}`} role="status" aria-live="polite" aria-busy="true">
      <div className="loading-skeleton-hero">
        <span className="loading-skeleton-emoji" aria-hidden>
          {cfg.emoji}
        </span>
        <div className="loading-skeleton-copy">
          <p className="loading-skeleton-title">{title}</p>
          <p className="loading-skeleton-hint">{cfg.hint}</p>
        </div>
      </div>
      <div className="loading-skeleton-bars">
        {Array.from({ length: cfg.rows }).map((_, i) => (
          <div key={i} className="loading-skeleton-row" style={{ animationDelay: `${i * 0.08}s` }}>
            <span className="skel-bar skel-bar-sm" />
            <span className="skel-bar skel-bar-lg" />
            <span className="skel-bar skel-bar-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
