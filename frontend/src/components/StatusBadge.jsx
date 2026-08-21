export default function StatusBadge({ status }) {
  const className = String(status).replace(/\s+/g, '');
  return <span className={`badge ${className}`}>{status}</span>;
}
