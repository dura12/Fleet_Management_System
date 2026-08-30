function escapeCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function rowToCsv(row) {
  return row.map(escapeCell).join(',');
}

export function downloadCsv(filename, sections) {
  const lines = [];
  for (const section of sections) {
    if (section.title) {
      lines.push(escapeCell(section.title));
    }
    if (section.headers?.length) {
      lines.push(rowToCsv(section.headers));
    }
    for (const row of section.rows || []) {
      lines.push(rowToCsv(row));
    }
    lines.push('');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function buildManagerExportSections(requests, vehicles, drivers, assignments) {
  const requestRows = (requests || []).map((r) => [
    r.requestNumber,
    r.status,
    r.requester?.fullName || '',
    r.requester?.department || '',
    r.branch || '',
    r.destination,
    r.purpose,
    formatDateTime(r.travelDate),
    formatDateTime(r.returnDate || r.travelDate),
    r.tripDuration || '',
    r.numberOfPassengers ?? '',
    r.priority || 'Normal',
    r.isOverdue ? 'Yes' : 'No',
    r.rejectionReason || '',
    formatDate(r.submittedAt || r.createdAt),
  ]);

  const vehicleRows = (vehicles || []).map((v) => [
    v.vehicleId,
    v.plateNumber,
    v.model,
    v.vehicleType,
    v.seatingCapacity ?? '',
    v.currentMileage ?? 0,
    v.status,
  ]);

  const driverRows = (drivers || []).map((d) => [
    d.driverId,
    d.driverName,
    d.employeeId || '',
    d.licenseNumber,
    formatDate(d.licenseExpiry),
    d.isActive ? 'Active' : 'Inactive',
    new Date(d.licenseExpiry) < new Date() ? 'Yes' : 'No',
  ]);

  const assignmentRows = (assignments || []).map((a) => [
    a.assignmentId,
    a.request?.requestNumber || '',
    a.request?.status || '',
    a.request?.requester?.fullName || '',
    a.request?.destination || '',
    a.vehicle?.plateNumber || '',
    a.vehicle?.model || '',
    a.driver?.driverName || '',
    a.driver?.licenseNumber || '',
    formatDate(a.assignmentDate),
    a.returnedAt ? formatDate(a.returnedAt) : '',
    a.notes || '',
  ]);

  return [
    {
      title: 'ALL REQUESTS',
      headers: [
        'Request ID', 'Status', 'Requester', 'Department', 'Branch', 'Destination', 'Purpose',
        'Travel Date', 'Expected Return', 'Trip Duration', 'Passengers', 'Priority', 'Overdue', 'Rejection Reason', 'Submitted',
      ],
      rows: requestRows,
    },
    {
      title: 'VEHICLE REGISTER',
      headers: ['Vehicle ID', 'Plate', 'Model', 'Type', 'Seats', 'Mileage', 'Status'],
      rows: vehicleRows,
    },
    {
      title: 'DRIVERS',
      headers: ['Driver ID', 'Name', 'Employee ID', 'License #', 'License Expiry', 'Status', 'License Expired'],
      rows: driverRows,
    },
    {
      title: 'ASSIGNMENT HISTORY',
      headers: [
        'Assignment ID', 'Request ID', 'Request Status', 'Requester', 'Destination',
        'Vehicle Plate', 'Vehicle Model', 'Driver', 'License #', 'Assigned', 'Returned', 'Notes',
      ],
      rows: assignmentRows,
    },
  ];
}

export function buildVehicleRegisterExport(data) {
  return [{
    title: 'VEHICLE REGISTER',
    headers: ['Vehicle ID', 'Plate', 'Model', 'Type', 'Seats', 'Mileage', 'Status'],
    rows: (data || []).map((v) => [
      v.vehicleId,
      v.plateNumber,
      v.model,
      v.vehicleType,
      v.seatingCapacity ?? '',
      v.currentMileage ?? 0,
      v.status,
    ]),
  }];
}

export function buildRequestsByStatusExport(data) {
  if (!data || typeof data !== 'object') {
    return [{ title: 'REQUESTS BY STATUS', headers: ['Request ID', 'Status', 'Requester', 'Branch', 'Destination', 'Trip Duration', 'Travel Date', 'Expected Return', 'Priority'], rows: [] }];
  }
  const rows = [];
  for (const [status, items] of Object.entries(data)) {
    const list = Array.isArray(items) ? items : items ? [items] : [];
    for (const r of list) {
      rows.push([
        r.requestNumber,
        status,
        r.requester?.fullName || '',
        r.branch || '',
        r.destination,
        r.tripDuration || '',
        formatDateTime(r.travelDate),
        formatDateTime(r.returnDate || r.travelDate),
        r.priority || 'Normal',
      ]);
    }
  }
  return [{
    title: 'REQUESTS BY STATUS',
    headers: ['Request ID', 'Status', 'Requester', 'Branch', 'Destination', 'Trip Duration', 'Travel Date', 'Expected Return', 'Priority'],
    rows,
  }];
}

export function buildAssignmentHistoryExport(data) {
  return [{
    title: 'ASSIGNMENT HISTORY',
    headers: [
      'Assignment ID', 'Request ID', 'Requester', 'Destination', 'Vehicle', 'Driver',
      'Assigned', 'Returned',
    ],
    rows: (data || []).map((a) => [
      a.assignmentId,
      a.request?.requestNumber || '',
      a.request?.requester?.fullName || '',
      a.request?.destination || '',
      `${a.vehicle?.plateNumber || ''} (${a.vehicle?.model || ''})`.trim(),
      a.driver?.driverName || '',
      formatDate(a.assignmentDate),
      a.returnedAt ? formatDate(a.returnedAt) : '',
    ]),
  }];
}
