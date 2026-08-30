import { useEffect, useState } from 'react';
import { api } from '../api/client';
import AutocompleteInput from './AutocompleteInput';
import DurationChips from './DurationChips';
import {
  EMPTY_REQUEST_FORM,
  DEFAULT_TRAVEL_TIME,
  getExpectedReturnPreview,
  MAX_PASSENGERS,
} from '../utils/requestForm';

export function useRequestFormSuggestions() {
  const [suggestions, setSuggestions] = useState({
    startLocations: [],
    destinations: [],
    purposes: [],
    defaultBranch: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getRequestFormSuggestions()
      .then((data) => {
        if (!cancelled) setSuggestions(data);
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions({ startLocations: [], destinations: [], purposes: [], defaultBranch: '' });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const initialForm = {
    ...EMPTY_REQUEST_FORM,
    branch: suggestions.defaultBranch || '',
  };

  return { suggestions, loading, initialForm };
}

function formatPreview(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function RequestFormFields({ form, setForm, suggestions, idPrefix = 'req' }) {
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const expectedReturn = getExpectedReturnPreview(form);

  return (
    <div className="grid-form">
      <div className="full">
        <label>Start Location</label>
        <AutocompleteInput
          value={form.branch}
          onChange={update('branch')}
          suggestions={suggestions.startLocations || []}
          listId={`${idPrefix}-start-locations`}
          placeholder="Select or type a start location"
          required
        />
      </div>
      <div className="full">
        <label>Destination</label>
        <AutocompleteInput
          value={form.destination}
          onChange={update('destination')}
          suggestions={suggestions.destinations || []}
          listId={`${idPrefix}-destinations`}
          placeholder="Select or type a destination"
          required
        />
      </div>
      <div className="full">
        <label>Purpose</label>
        <AutocompleteInput
          value={form.purpose}
          onChange={update('purpose')}
          suggestions={suggestions.purposes || []}
          listId={`${idPrefix}-purposes`}
          multiline
          required
        />
      </div>
      <div>
        <label>Departure Date</label>
        <input type="date" value={form.travelDate} onChange={update('travelDate')} required />
      </div>
      <div>
        <label>Departure Time</label>
        <input type="time" value={form.travelTime || DEFAULT_TRAVEL_TIME} onChange={update('travelTime')} required />
      </div>
      <div className="full">
        <label>How long do you need the vehicle?</label>
        <p className="field-hint">Pick a duration — the system calculates your expected return. The fleet team records the actual return when the trip is completed.</p>
        <DurationChips
          value={form.tripDuration}
          onChange={(tripDuration) => setForm({ ...form, tripDuration })}
          idPrefix={idPrefix}
        />
        {expectedReturn && (
          <p className="duration-preview">
            Expected back: <strong>{formatPreview(expectedReturn)}</strong>
          </p>
        )}
      </div>
      <div>
        <label>Number of Passengers</label>
        <input
          type="number"
          min="1"
          max={MAX_PASSENGERS}
          value={form.numberOfPassengers}
          onChange={update('numberOfPassengers')}
          required
        />
      </div>
      <div>
        <label>Priority</label>
        <select value={form.priority} onChange={update('priority')}>
          <option value="Normal">Normal</option>
          <option value="Urgent">Urgent</option>
        </select>
      </div>
    </div>
  );
}
