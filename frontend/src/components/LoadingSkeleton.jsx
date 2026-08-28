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
};

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

export default function LoadingSkeleton({ variant = 'table', message }) {
  if (variant === 'employee-table') {
    const cfg = VARIANTS['employee-table'];
    return <EmployeeTableSkeleton rows={cfg.rows} />;
  }

  if (variant === 'assignment-panels') {
    return <AssignmentPanelsSkeleton />;
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
