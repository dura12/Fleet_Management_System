import { useEffect } from 'react';

export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  size = 'md',
  footer,
  className = '',
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [onClose]);

  return (
    <div className={`modal-backdrop${className ? ` ${className}` : ''}`} onClick={onClose} role="presentation">
      <div
        className={`modal-card app-modal app-modal-${size}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
      >
        <div className="app-modal-header">
          <div className="app-modal-heading">
            {title && <h2>{title}</h2>}
            {subtitle && <p className="app-modal-sub">{subtitle}</p>}
          </div>
          <button type="button" className="app-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="app-modal-body">{children}</div>
        {footer && <div className="app-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
