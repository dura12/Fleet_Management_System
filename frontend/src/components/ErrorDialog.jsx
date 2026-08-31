import Modal from './Modal';

export default function ErrorDialog({ message, onClose }) {
  if (!message) return null;

  return (
    <Modal title="Something went wrong" size="md" className="error-dialog-backdrop" onClose={onClose}>
      <div className="error-dialog-body">
        <p className="error-dialog-message">{message}</p>
        <div className="btn-row app-modal-actions error-dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </Modal>
  );
}
