import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { validatePassengers, formToRequestPayload } from '../utils/requestForm';
import RequestFormFields, { useRequestFormSuggestions } from '../components/RequestFormFields';
import { useErrorAlert } from '../context/ErrorContext';

export default function NewRequest() {
  const navigate = useNavigate();
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
      navigate(`/requests/${created._id}`);
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>New Vehicle Request</h1>
      <p className="subtitle">Save as a draft to edit later, or submit directly for manager approval.</p>
      {loading || !form ? (
        <div className="empty-state">Loading form…</div>
      ) : (
        <form className="card">
          <RequestFormFields form={form} setForm={setForm} suggestions={suggestions} idPrefix="new" />
          <div className="btn-row">
            <button type="button" className="btn secondary" onClick={(e) => handleSubmit(e, false)} disabled={saving}>Save as Draft</button>
            <button type="button" className="btn" onClick={(e) => handleSubmit(e, true)} disabled={saving}>Save &amp; Submit</button>
          </div>
        </form>
      )}
    </div>
  );
}
