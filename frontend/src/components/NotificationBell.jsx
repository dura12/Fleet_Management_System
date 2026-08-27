import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useRequestUi } from '../context/RequestUiContext';

function formatWhen(dateStr) {
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

export default function NotificationBell() {
  const { openDetail } = useRequestUi();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [{ count: unread }, list] = await Promise.all([
        api.getUnreadNotificationCount(),
        open ? api.getNotifications() : Promise.resolve(null),
      ]);
      setCount(unread || 0);
      if (list) setItems(list);
    } catch {
      // ignore polling errors
    }
  }, [open]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return undefined;
    setLoading(true);
    api.getNotifications()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const handleOpen = () => setOpen((v) => !v);

  const handleClickItem = async (n) => {
    try {
      if (!n.readAt) await api.markNotificationRead(n._id);
    } catch {
      // ignore
    }
    setItems((prev) =>
      prev.map((x) => (x._id === n._id ? { ...x, readAt: x.readAt || new Date().toISOString() } : x)),
    );
    setCount((c) => Math.max(0, c - (n.readAt ? 0 : 1)));
    setOpen(false);
    if (n.request) openDetail(n.request);
  };

  const handleMarkAll = async () => {
    try {
      await api.markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
      setCount(0);
    } catch {
      // ignore
    }
  };

  return (
    <div className="notification-bell-wrap" ref={wrapRef}>
      <button
        type="button"
        className="icon-btn notification-bell-btn"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={handleOpen}
      >
        🔔
        {count > 0 && <span className="notification-badge">{count > 99 ? '99+' : count}</span>}
      </button>
      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notifications">
          <div className="notification-panel-header">
            <strong>Notifications</strong>
            {count > 0 && (
              <button type="button" className="link-btn" onClick={handleMarkAll}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-panel-body">
            {loading && <p className="notification-empty">Loading…</p>}
            {!loading && items.length === 0 && (
              <p className="notification-empty">No notifications yet.</p>
            )}
            {!loading &&
              items.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  className={`notification-item${!n.readAt ? ' unread' : ''}`}
                  onClick={() => handleClickItem(n)}
                >
                  <div className="notification-item-top">
                    <span className="notification-item-title">{n.title}</span>
                    <span className="notification-item-time">{formatWhen(n.createdAt)}</span>
                  </div>
                  <p className="notification-item-msg">{n.message}</p>
                  {n.requestNumber && (
                    <span className="notification-item-meta">{n.requestNumber}</span>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
