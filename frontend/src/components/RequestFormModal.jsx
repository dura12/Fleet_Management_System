import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { validatePassengers, formToRequestPayload } from '../utils/requestForm';
import Modal from './Modal';
import RequestFormFields, { useRequestFormSuggestions } from './RequestFormFields';
import { useErrorAlert } from '../context/ErrorContext';

export default function RequestFormModal({ onClose, onCreated }) {
  const { showError } = useErrorAlert();
  const { suggestions, loading, initialForm } = useRequestFormSuggestions();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && form === null) {
      setForm(initialForm);
    }
  }, [loading, initialForm, form]);

  const handleSubmit = async (e, alsoSubmit) => {
    e.preventDefault();
    const passengerError = validatePassengers(form.numberOfPassengers);
    if (passengerError) {
      showError(passengerError);
      return;
    }
    setSaving(true);
    try {
      const created = await api.createRequest(formToRequestPayload(form));
      if (alsoSubmit) {
        await api.submitRequest(created._id);
      }
      onCreated?.(created);
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="New Vehicle Request"
      subtitle="Save as a draft to edit later, or submit directly for manager approval."
      size="md"
      onClose={onClose}
    >
      {loading || !form ? (
        <div className="empty-state">Loading form…</div>
      ) : (
        <form>
          <RequestFormFields form={form} setForm={setForm} suggestions={suggestions} idPrefix="modal" />
          <div className="btn-row app-modal-actions">
            <button type="button" className="btn secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn secondary" onClick={(e) => handleSubmit(e, false)} disabled={saving}>
              Save as Draft
            </button>
            <button type="button" className="btn" onClick={(e) => handleSubmit(e, true)} disabled={saving}>
              Save &amp; Submit
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
