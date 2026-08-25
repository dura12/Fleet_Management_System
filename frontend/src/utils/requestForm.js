export const MAX_PASSENGERS = 50;

export function toDateInputValue(dateStr) {
  return new Date(dateStr).toISOString().slice(0, 10);
}

export function validatePassengers(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > MAX_PASSENGERS) {
    return `Number of passengers must be between 1 and ${MAX_PASSENGERS}.`;
  }
  return null;
}
