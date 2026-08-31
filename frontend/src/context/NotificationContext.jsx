import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';
import NotificationToasts from '../components/NotificationToasts';
import { NOTIFICATION_PANEL_LIMIT } from '../utils/notificationMeta';

const NotificationContext = createContext(null);

const POLL_MS = 15000;
const TOAST_MS = 5200;

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const knownIdsRef = useRef(new Set());
  const initializedRef = useRef(false);
  const timersRef = useRef(new Map());

  const clearToastTimer = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const removeToast = useCallback((id) => {
    clearToastTimer(id);
    setToasts((prev) => prev.map((t) => (t._id === id ? { ...t, exiting: true } : t)));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t._id !== id));
    }, 320);
  }, [clearToastTimer]);

  const pushToast = useCallback((notification) => {
    setToasts((prev) => {
      if (prev.some((t) => t._id === notification._id)) return prev;
      return [{ ...notification, entering: true }, ...prev].slice(0, 4);
    });

    clearToastTimer(notification._id);
    const timer = window.setTimeout(() => removeToast(notification._id), TOAST_MS);
    timersRef.current.set(notification._id, timer);
  }, [clearToastTimer, removeToast]);

  const refresh = useCallback(async ({ toastNew = true } = {}) => {
    try {
      const [list, countData] = await Promise.all([
        api.getNotifications(),
        api.getUnreadNotificationCount(),
      ]);
      const arr = Array.isArray(list) ? list : [];
      setItems(arr);
      setCount(countData?.count || 0);

      if (!initializedRef.current) {
        arr.forEach((n) => knownIdsRef.current.add(n._id));
        initializedRef.current = true;
        return;
      }

      if (!toastNew) return;

      for (const n of arr) {
        if (!knownIdsRef.current.has(n._id) && !n.readAt) {
          knownIdsRef.current.add(n._id);
          pushToast(n);
        }
      }
    } catch {
      // ignore polling errors
    }
  }, [pushToast]);

  const markRead = useCallback(async (id) => {
    let wasUnread = false;
    setItems((prev) =>
      prev.map((x) => {
        if (x._id === id && !x.readAt) wasUnread = true;
        return x._id === id ? { ...x, readAt: x.readAt || new Date().toISOString() } : x;
      }),
    );
    if (!wasUnread) return;
    try {
      await api.markNotificationRead(id);
    } catch {
      // ignore
    }
    setCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead();
      setItems((prev) =>
        prev
          .map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() }))
          .slice(0, NOTIFICATION_PANEL_LIMIT),
      );
      setCount(0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh({ toastNew: false });
    const id = window.setInterval(() => refresh(), POLL_MS);
    const onFocus = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onManualRefresh = () => refresh();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('fms-notifications-refresh', onManualRefresh);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('fms-notifications-refresh', onManualRefresh);
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [refresh]);

  const value = useMemo(
    () => ({
      items,
      count,
      refresh,
      markRead,
      markAllRead,
      removeToast,
    }),
    [items, count, refresh, markRead, markAllRead, removeToast],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {createPortal(
        <NotificationToasts toasts={toasts} onDismiss={removeToast} markRead={markRead} />,
        document.body,
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}
