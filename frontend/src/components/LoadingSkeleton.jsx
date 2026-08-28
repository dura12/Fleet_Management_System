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
};

export default function LoadingSkeleton({ variant = 'table', message }) {
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
