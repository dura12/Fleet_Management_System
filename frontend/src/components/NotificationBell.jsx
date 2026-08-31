import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNotifications } from '../context/NotificationContext';
import { useRequestUi } from '../context/RequestUiContext';
import { formatWhen, getNotificationMeta, NOTIFICATION_PANEL_LIMIT, requestIdOf } from '../utils/notificationMeta';

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3a5 5 0 0 0-5 5v2.1c0 .5-.2 1-.5 1.4L5.1 14.2A1 1 0 0 0 6 16h12a1 1 0 0 0 .9-1.4l-1.4-2.7c-.3-.4-.5-.9-.5-1.4V8a5 5 0 0 0-5-5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M10 18a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function NotificationBell() {
  const { items, count, refresh, markRead, markAllRead } = useNotifications();
  const { openDetail, refreshKey } = useRequestUi();
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(undefined);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);

  const updatePanelPosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(max-width: 768px)').matches) {
      setPanelStyle(undefined);
      return;
    }
    const anchor = wrapRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const width = Math.min(380, window.innerWidth - 16);
    let right = window.innerWidth - r.right;
    right = Math.max(8, Math.min(right, window.innerWidth - width - 8));
    const top = Math.min(r.bottom + 10, window.innerHeight - 80);
    setPanelStyle({ top: `${top}px`, right: `${right}px`, left: 'auto' });
  }, []);

  useEffect(() => {
    refresh({ toastNew: false });
  }, [refreshKey, refresh]);

  useEffect(() => {
    if (!open) return undefined;
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
  }, [open, updatePanelPosition, items.length]);

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

  const handleClickItem = async (n) => {
    if (!n.readAt) await markRead(n._id);
    setOpen(false);
    const id = requestIdOf(n);
    if (id) openDetail(id);
  };

  const unread = items.filter((n) => !n.readAt).length;
  const visibleItems = items.slice(0, NOTIFICATION_PANEL_LIMIT);
  const hiddenCount = Math.max(0, items.length - NOTIFICATION_PANEL_LIMIT);

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    await markAllRead();
  };

  const panel =
    open &&
    createPortal(
      <>
        <div className="notification-backdrop" onClick={() => setOpen(false)} aria-hidden />
        <div
          ref={panelRef}
          className="notification-panel"
          role="dialog"
          aria-label="Notifications"
          style={panelStyle}
        >
          <div className="notification-panel-header">
            <div className="notification-panel-heading">
              <strong>Notifications</strong>
              {unread > 0 && <span className="notification-panel-pill">{unread} new</span>}
            </div>
            {count > 0 && (
              <button type="button" className="link-btn" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-panel-body">
            {visibleItems.length === 0 ? (
              <div className="notification-empty">
                <span className="notification-empty-icon" aria-hidden>🔔</span>
                <p>You're all caught up</p>
                <span className="notification-empty-hint">New updates will pop up here.</span>
              </div>
            ) : (
              visibleItems.map((n) => {
                const meta = getNotificationMeta(n.type);
                return (
                  <button
                    key={n._id}
                    type="button"
                    className={`notification-item notification-item--${meta.tone}${!n.readAt ? ' unread' : ''}`}
                    onClick={() => handleClickItem(n)}
                  >
                    <span className="notification-item-icon" aria-hidden>
                      {meta.icon}
                    </span>
                    <span className="notification-item-main">
                      <span className="notification-item-top">
                        <span className="notification-item-title">{n.title}</span>
                        <span className="notification-item-time">{formatWhen(n.createdAt)}</span>
                      </span>
                      <p className="notification-item-msg">{n.message}</p>
                      {n.requestNumber && (
                        <span className="notification-item-meta">{n.requestNumber}</span>
                      )}
                    </span>
                    {!n.readAt && <span className="notification-item-dot" aria-label="Unread" />}
                  </button>
                );
              })
            )}
          </div>
          {hiddenCount > 0 && (
            <div className="notification-panel-footer">
              Showing latest {NOTIFICATION_PANEL_LIMIT} of {items.length}
            </div>
          )}
        </div>
      </>,
      document.body,
    );

  return (
    <div className="notification-bell-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`icon-btn notification-bell-btn${count > 0 ? ' has-unread' : ''}`}
        title="Notifications"
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon />
        {count > 0 && <span className="notification-badge">{count > 99 ? '99+' : count}</span>}
      </button>
      {panel}
    </div>
  );
}
