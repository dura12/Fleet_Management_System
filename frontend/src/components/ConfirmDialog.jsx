import Modal from './Modal';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal title={title} subtitle={message} size="md" onClose={onCancel}>
      <div className="confirm-dialog-body">
        <p className="confirm-dialog-emoji" aria-hidden>
          {danger ? '⚠️' : '❓'}
        </p>
        <div className="btn-row app-modal-actions confirm-dialog-actions">
          <button type="button" className="btn secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn${danger ? ' danger' : ''}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
