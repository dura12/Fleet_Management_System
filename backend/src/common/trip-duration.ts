export const TRIP_DURATIONS = ['2h', '4h', '1d', '2d', '3d', '1w'] as const;
export type TripDuration = (typeof TRIP_DURATIONS)[number];

export const TRIP_DURATION_LABELS: Record<TripDuration, string> = {
  '2h': 'Quick trip',
  '4h': 'Half day',
  '1d': 'Full day',
  '2d': '2 days',
  '3d': '3 days',
  '1w': '1 week',
};

export function isTripDuration(value: string): value is TripDuration {
  return (TRIP_DURATIONS as readonly string[]).includes(value);
}

export function computeExpectedReturn(travelDate: Date | string, tripDuration: TripDuration): Date {
  const start = new Date(travelDate);
  if (Number.isNaN(start.getTime())) {
    throw new Error('Invalid travel date.');
  }

  const result = new Date(start);

  switch (tripDuration) {
    case '2h':
      result.setHours(result.getHours() + 2);
      return result;
    case '4h':
      result.setHours(result.getHours() + 4);
      return result;
    case '1d': {
      if (start.getHours() >= 13) {
        result.setHours(result.getHours() + 4);
        return result;
      }
      result.setHours(17, 0, 0, 0);
      return result;
    }
    case '2d':
      result.setDate(result.getDate() + 2);
      return result;
    case '3d':
      result.setDate(result.getDate() + 3);
      return result;
    case '1w':
      result.setDate(result.getDate() + 7);
      return result;
    default:
      result.setHours(result.getHours() + 4);
      return result;
  }
}

export function inferTripDuration(travelDate: Date | string, returnDate: Date | string): TripDuration {
  const start = new Date(travelDate);
  const end = new Date(returnDate);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours <= 2.5) return '2h';
  if (diffHours <= 5) return '4h';
  if (diffDays <= 1.5) return '1d';
  if (diffDays <= 2.5) return '2d';
  if (diffDays <= 4) return '3d';
  return '1w';
}
