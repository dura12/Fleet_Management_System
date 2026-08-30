import { TRIP_DURATION_OPTIONS } from '../utils/requestForm';

export default function DurationChips({ value, onChange, idPrefix = 'duration' }) {
  return (
    <div className="duration-chips" role="radiogroup" aria-label="Trip duration">
      {TRIP_DURATION_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`duration-chip${active ? ' active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            <span className="duration-chip-label">{option.label}</span>
            <span className="duration-chip-subtitle">{option.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
