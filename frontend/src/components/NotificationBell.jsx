import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

function requestIdOf(notification) {
  const ref = notification?.request;
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref._id || null;
}

export default function NotificationBell() {
  const { openDetail, refreshKey } = useRequestUi();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [panelStyle, setPanelStyle] = useState(undefined);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);

  const refreshCount = useCallback(async () => {
    try {
      const data = await api.getUnreadNotificationCount();
      setCount(data?.count || 0);
    } catch {
      // ignore polling errors
    }
  }, []);

  const refreshList = useCallback(async () => {
    try {
      const list = await api.getNotifications();
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems((prev) => (prev.length ? prev : []));
    }
  }, []);

  const updatePanelPosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(max-width: 768px)').matches) {
      setPanelStyle(undefined);
      return;
    }
    const anchor = wrapRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 16);
    let right = window.innerWidth - r.right;
    right = Math.max(8, Math.min(right, window.innerWidth - width - 8));
    const top = Math.min(r.bottom + 8, window.innerHeight - 80);
    setPanelStyle({ top: `${top}px`, right: `${right}px`, left: 'auto' });
  }, []);

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, 20000);
    const onFocus = () => refreshCount();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshCount();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('fms-notifications-refresh', refreshCount);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('fms-notifications-refresh', refreshCount);
    };
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();
    if (open) refreshList();
  }, [refreshKey, refreshCount, open, refreshList]);

  useEffect(() => {
    if (!open) return undefined;
    refreshList();
    updatePanelPosition();
    const onResize = () => updatePanelPosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    const prevOverflow = document.body.style.overflow;
    if (window.matchMedia('(max-width: 768px)').matches) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, refreshList, updatePanelPosition, items.length]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      const t = e.target;
      if (wrapRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
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
    const id = requestIdOf(n);
    if (id) openDetail(id);
  };

  const handleMarkAll = async (e) => {
    e.stopPropagation();
    try {
      await api.markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
      setCount(0);
    } catch {
      // ignore
    }
  };

  const panel =
    open &&
    createPortal(
      <>
        <div
          className="notification-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden
        />
        <div
          ref={panelRef}
          className="notification-panel"
          role="dialog"
          aria-label="Notifications"
          style={panelStyle}
        >
          <div className="notification-panel-header">
            <strong>Notifications</strong>
            {count > 0 && (
              <button type="button" className="link-btn" onClick={handleMarkAll}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-panel-body">
            {items.length === 0 ? (
              <p className="notification-empty">🔕 No notifications yet.</p>
            ) : (
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
              ))
            )}
          </div>
        </div>
      </>,
      document.body,
    );

  return (
    <div className="notification-bell-wrap" ref={wrapRef}>
      <button
        type="button"
        className="icon-btn notification-bell-btn"
        title="Notifications"
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={handleOpen}
      >
        <span aria-hidden>🔔</span>
        {count > 0 && <span className="notification-badge">{count > 99 ? '99+' : count}</span>}
      </button>
      {panel}
    </div>
  );
}
