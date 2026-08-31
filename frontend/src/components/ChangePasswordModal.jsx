import { useState } from 'react';
import { api } from '../api/client';
import Modal from './Modal';
import { useErrorAlert } from '../context/ErrorContext';

export default function ChangePasswordModal({ onClose }) {
  const { showError } = useErrorAlert();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');

    if (newPassword.length < 6) {
      showError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      showError('New password must be different from your current password.');
      return;
    }

    setBusy(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setSuccess('Password updated successfully. Use your new password next time you sign in.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Update password"
      subtitle="Replace the default password with one only you know."
      size="md"
      onClose={onClose}
    >
      {success && <div className="success-banner">{success}</div>}
      <form onSubmit={handleSubmit} className="change-password-form">
        <label>
          Current password
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            disabled={busy}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            disabled={busy}
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            disabled={busy}
          />
        </label>
        <p className="form-hint">Use at least 6 characters. Keep it private — admin will not see it.</p>
        <div className="btn-row app-modal-actions">
          <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
