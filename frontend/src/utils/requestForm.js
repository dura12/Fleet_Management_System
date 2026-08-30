export const MAX_PASSENGERS = 50;
export const DEFAULT_TRAVEL_TIME = '09:00';
export const DEFAULT_TRIP_DURATION = '4h';

export const TRIP_DURATION_OPTIONS = [
  { value: '2h', label: 'Quick trip', subtitle: 'Short errand (~2 hours)' },
  { value: '4h', label: 'Half day', subtitle: 'Morning or afternoon (~4 hours)' },
  { value: '1d', label: 'Full day', subtitle: 'Back by end of business day' },
  { value: '2d', label: '2 days', subtitle: 'Overnight / multi-day' },
  { value: '3d', label: '3 days', subtitle: 'Extended site visit' },
  { value: '1w', label: '1 week', subtitle: 'Long assignment' },
];

export const TRIP_DURATION_LABELS = Object.fromEntries(
  TRIP_DURATION_OPTIONS.map((o) => [o.value, o.label]),
);

export const EMPTY_REQUEST_FORM = {
  branch: '',
  destination: '',
  purpose: '',
  travelDate: '',
  travelTime: DEFAULT_TRAVEL_TIME,
  tripDuration: DEFAULT_TRIP_DURATION,
  numberOfPassengers: 1,
  priority: 'Normal',
};

export function toDateInputValue(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toTimeInputValue(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

export function combineDateTime(date, time) {
  if (!date) return '';
  return new Date(`${date}T${time || '00:00'}`).toISOString();
}

export function computeExpectedReturn(travelIso, tripDuration) {
  const start = new Date(travelIso);
  if (Number.isNaN(start.getTime())) return null;

  const result = new Date(start);
  switch (tripDuration) {
    case '2h':
      result.setHours(result.getHours() + 2);
      break;
    case '4h':
      result.setHours(result.getHours() + 4);
      break;
    case '1d':
      if (start.getHours() >= 13) {
        result.setHours(result.getHours() + 4);
      } else {
        result.setHours(17, 0, 0, 0);
      }
      break;
    case '2d':
      result.setDate(result.getDate() + 2);
      break;
    case '3d':
      result.setDate(result.getDate() + 3);
      break;
    case '1w':
      result.setDate(result.getDate() + 7);
      break;
    default:
      result.setHours(result.getHours() + 4);
  }
  return result.toISOString();
}

export function inferTripDuration(travelDate, returnDate) {
  const start = new Date(travelDate);
  const end = new Date(returnDate);
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffHours <= 2.5) return '2h';
  if (diffHours <= 5) return '4h';
  if (diffDays <= 1.5) return '1d';
  if (diffDays <= 2.5) return '2d';
  if (diffDays <= 4) return '3d';
  return '1w';
}

export function formatTripDuration(tripDuration) {
  return TRIP_DURATION_LABELS[tripDuration] || tripDuration || '—';
}

export function formToRequestPayload(form) {
  const travelDate = combineDateTime(form.travelDate, form.travelTime);
  return {
    branch: form.branch,
    destination: form.destination,
    purpose: form.purpose,
    travelDate,
    tripDuration: form.tripDuration || DEFAULT_TRIP_DURATION,
    numberOfPassengers: Number(form.numberOfPassengers),
    priority: form.priority,
  };
}

export function requestToFormFields(request) {
  const travel = {
    date: toDateInputValue(request.travelDate),
    time: toTimeInputValue(request.travelDate) || DEFAULT_TRAVEL_TIME,
  };
  return {
    branch: request.branch || '',
    destination: request.destination,
    purpose: request.purpose,
    travelDate: travel.date,
    travelTime: travel.time,
    tripDuration: request.tripDuration || inferTripDuration(request.travelDate, request.returnDate || request.travelDate),
    numberOfPassengers: request.numberOfPassengers,
    priority: request.priority || 'Normal',
  };
}

export function getExpectedReturnPreview(form) {
  const travelDate = combineDateTime(form.travelDate, form.travelTime);
  if (!travelDate) return null;
  return computeExpectedReturn(travelDate, form.tripDuration || DEFAULT_TRIP_DURATION);
}

export function validatePassengers(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_PASSENGERS) {
    return `Number of passengers must be between 1 and ${MAX_PASSENGERS}.`;
  }
  return null;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateRange(travelDate, returnDate) {
  if (!travelDate) return '—';
  const start = new Date(travelDate);
  const end = new Date(returnDate || travelDate);
  if (start.getTime() === end.getTime()) return formatDateTime(travelDate);
  return `${formatDateTime(travelDate)} – ${formatDateTime(returnDate || travelDate)}`;
}

export function formatTripSummary(request) {
  const duration = formatTripDuration(request.tripDuration);
  const range = formatDateRange(request.travelDate, request.returnDate);
  return duration ? `${duration} · ${range}` : range;
}

export function getTripPhase(travelDate) {
  return new Date(travelDate) <= new Date() ? 'inTransit' : 'scheduled';
}
