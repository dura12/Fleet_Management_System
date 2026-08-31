import { useRequestUi } from '../context/RequestUiContext';
import { getNotificationMeta, requestIdOf } from '../utils/notificationMeta';

export default function NotificationToasts({ toasts, onDismiss, markRead }) {
  const { openDetail } = useRequestUi();

  if (!toasts.length) return null;

  const handleClick = async (toast) => {
    if (!toast.readAt) await markRead(toast._id);
    onDismiss(toast._id);
    const requestId = requestIdOf(toast);
    if (requestId) openDetail(requestId);
  };

  return (
    <div className="notification-toast-stack" aria-live="polite" aria-label="Recent notifications">
      {toasts.map((toast) => {
        const meta = getNotificationMeta(toast.type);
        return (
          <div
            key={toast._id}
            className={`notification-toast notification-toast--${meta.tone}${toast.entering ? ' is-entering' : ''}${toast.exiting ? ' is-exiting' : ''}`}
            role="status"
          >
            <button
              type="button"
              className="notification-toast-body"
              onClick={() => handleClick(toast)}
            >
              <span className="notification-toast-icon" aria-hidden>
                {meta.icon}
              </span>
              <span className="notification-toast-content">
                <span className="notification-toast-label">{meta.label}</span>
                <strong className="notification-toast-title">{toast.title}</strong>
                <span className="notification-toast-message">{toast.message}</span>
                {toast.requestNumber && (
                  <span className="notification-toast-ref">{toast.requestNumber}</span>
                )}
              </span>
            </button>
            <button
              type="button"
              className="notification-toast-close"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(toast._id)}
            >
              ×
            </button>
            <span className="notification-toast-progress" aria-hidden />
          </div>
        );
      })}
    </div>
  );
}
