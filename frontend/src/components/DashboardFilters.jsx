export default function DashboardFilters({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  children,
}) {
  return (
    <div className="dash-toolbar filters">
      <div className="dash-toolbar-search">
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={searchPlaceholder}
        />
      </div>
      {children}
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      {label && <label>{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function matchRequestSearch(r, q) {
  if (!q) return true;
  return (
    r.requestNumber?.toLowerCase().includes(q) ||
    r.requester?.fullName?.toLowerCase().includes(q) ||
    r.destination?.toLowerCase().includes(q) ||
    r.purpose?.toLowerCase().includes(q)
  );
}

export function filterRequests(requests, { search = '', priority = '', status = '' } = {}) {
  const q = search.trim().toLowerCase();
  return requests.filter((r) => {
    if (status && r.status !== status) return false;
    if (priority === 'urgent' && r.priority !== 'Urgent') return false;
    if (priority === 'overdue' && !r.isOverdue) return false;
    if (priority === 'normal' && (r.priority === 'Urgent' || r.isOverdue)) return false;
    return matchRequestSearch(r, q);
  });
}

export function filterVehicles(vehicles, { search = '', status = '' } = {}) {
  const q = search.trim().toLowerCase();
  return vehicles.filter((v) => {
    if (status && v.status !== status) return false;
    if (!q) return true;
    return (
      v.vehicleId?.toLowerCase().includes(q) ||
      v.plateNumber?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q) ||
      v.vehicleType?.toLowerCase().includes(q)
    );
  });
}

export function filterDrivers(drivers, { search = '', status = '' } = {}) {
  const q = search.trim().toLowerCase();
  const now = new Date();
  return drivers.filter((d) => {
    const expired = new Date(d.licenseExpiry) < now;
    const driverStatus = !d.isActive ? 'inactive' : expired ? 'expired' : 'active';
    if (status === 'active' && driverStatus !== 'active') return false;
    if (status === 'expired' && driverStatus !== 'expired') return false;
    if (status === 'inactive' && driverStatus !== 'inactive') return false;
    if (!q) return true;
    return (
      d.driverId?.toLowerCase().includes(q) ||
      d.driverName?.toLowerCase().includes(q) ||
      d.licenseNumber?.toLowerCase().includes(q) ||
      d.employeeId?.toLowerCase().includes(q)
    );
  });
}

export function filterUsers(users, { search = '', role = '', active = '' } = {}) {
  const q = search.trim().toLowerCase();
  return users.filter((u) => {
    if (role && u.role !== role) return false;
    if (active === 'active' && u.isActive === false) return false;
    if (active === 'inactive' && u.isActive !== false) return false;
    if (!q) return true;
    return (
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.employeeId?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    );
  });
}
