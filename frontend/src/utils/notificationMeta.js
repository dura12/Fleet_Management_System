const META = {
  REQUEST_SUBMITTED: { icon: '📋', tone: 'info', label: 'Submitted' },
  REQUEST_APPROVED: { icon: '✅', tone: 'success', label: 'Approved' },
  REQUEST_REJECTED: { icon: '❌', tone: 'danger', label: 'Rejected' },
  REQUEST_ASSIGNED: { icon: '🚗', tone: 'primary', label: 'Assigned' },
  REQUEST_COMPLETED: { icon: '🏁', tone: 'success', label: 'Completed' },
  REQUEST_CANCELLED: { icon: '🚫', tone: 'muted', label: 'Cancelled' },
  STATUS_OVERRIDE: { icon: '⚙️', tone: 'warning', label: 'Updated' },
};

export function getNotificationMeta(type) {
  return META[type] || { icon: '🔔', tone: 'info', label: 'Update' };
}

export function requestIdOf(notification) {
  const ref = notification?.request;
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref._id || null;
}

export const NOTIFICATION_PANEL_LIMIT = 5;

export function formatWhen(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
