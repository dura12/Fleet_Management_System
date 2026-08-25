const STATUS_CONFIG = {
  Draft: { label: 'Draft', className: 'draft' },
  Submitted: { label: 'Submitted', className: 'submitted' },
  Approved: { label: 'Approved', className: 'submitted' },
  Rejected: { label: 'Rejected', className: 'rejected' },
  'Vehicle Assigned': { label: 'Assigned', className: 'assigned' },
  Completed: { label: 'Completed', className: 'completed' },
  Cancelled: { label: 'Cancelled', className: 'rejected' },
};

export default function EmployeeStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'draft' };
  return (
    <span className={`status-pill ${config.className}`}>
      <span className="status-dot" />
      {config.label}
    </span>
  );
}
