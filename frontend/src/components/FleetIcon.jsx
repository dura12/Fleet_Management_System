export default function FleetIcon({ size = 24, className = '', title }) {
  const labelled = Boolean(title);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      role={labelled ? 'img' : 'presentation'}
      aria-hidden={!labelled}
    >
      {title ? <title>{title}</title> : null}
      <path
        fill="currentColor"
        d="M3 10.5h11.2V7.2c0-.55.45-1 1-1h4.3l2.5 3.2V10.5H22c.55 0 1 .45 1 1v5.2c0 .55-.45 1-1 1h-1.05a2.45 2.45 0 0 1-4.8 0H9.85a2.45 2.45 0 0 1-4.8 0H4c-.55 0-1-.45-1-1v-4.2c0-.55.45-1 1-1Zm13.7-2.3-1.5-2H15v2h1.7ZM5 12.5v2.7h1.05a2.45 2.45 0 0 1 4.8 0h5.3a2.45 2.45 0 0 1 4.8 0H20v-2.7H5Zm2.35 5.2a1.15 1.15 0 1 0 0-2.3 1.15 1.15 0 0 0 0 2.3Zm11.3 0a1.15 1.15 0 1 0 0-2.3 1.15 1.15 0 0 0 0 2.3Z"
      />
      <path
        fill="currentColor"
        fillOpacity="0.35"
        d="M6.2 8.7h6.5v1.8H6.2V8.7Z"
      />
    </svg>
  );
}
