const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('fms_token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    const message = (data && data.message) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),

  getVehicles: (params = {}) => request(`/vehicles?${new URLSearchParams(params)}`),
  createVehicle: (dto) => request('/vehicles', { method: 'POST', body: dto }),
  updateVehicle: (id, dto) => request(`/vehicles/${id}`, { method: 'PATCH', body: dto }),
  deleteVehicle: (id) => request(`/vehicles/${id}`, { method: 'DELETE' }),

  getDrivers: (params = {}) => request(`/drivers?${new URLSearchParams(params)}`),
  createDriver: (dto) => request('/drivers', { method: 'POST', body: dto }),
  updateDriver: (id, dto) => request(`/drivers/${id}`, { method: 'PATCH', body: dto }),
  deleteDriver: (id) => request(`/drivers/${id}`, { method: 'DELETE' }),

  getRequests: (params = {}) => request(`/requests?${new URLSearchParams(params)}`),
  getRequest: (id) => request(`/requests/${id}`),
  getRequestAssignment: (id) => request(`/requests/${id}/assignment`),
  createRequest: (dto) => request('/requests', { method: 'POST', body: dto }),
  updateRequest: (id, dto) => request(`/requests/${id}`, { method: 'PATCH', body: dto }),
  submitRequest: (id) => request(`/requests/${id}/submit`, { method: 'POST' }),
  cancelRequest: (id) => request(`/requests/${id}`, { method: 'DELETE' }),
  approveRequest: (id) => request(`/requests/${id}/approve`, { method: 'POST' }),
  rejectRequest: (id, rejectionReason) => request(`/requests/${id}/reject`, { method: 'POST', body: { rejectionReason } }),
  assignVehicle: (id, dto) => request(`/requests/${id}/assign`, { method: 'POST', body: dto }),
  completeRequest: (id) => request(`/requests/${id}/complete`, { method: 'POST' }),

  vehicleRegister: () => request('/reports/vehicle-register'),
  requestsByStatus: () => request('/reports/requests-by-status'),
  assignmentHistory: () => request('/reports/assignment-history'),
};
