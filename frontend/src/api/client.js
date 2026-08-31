import { formatErrorMessage } from '../utils/errorMessage';

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
    const message = formatErrorMessage(data?.message) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  changePassword: ({ currentPassword, newPassword }) =>
    request('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),

  getVehicles: (params = {}) => request(`/vehicles?${new URLSearchParams(params)}`),
  createVehicle: (dto) => request('/vehicles', { method: 'POST', body: dto }),
  updateVehicle: (id, dto) => request(`/vehicles/${id}`, { method: 'PATCH', body: dto }),
  deleteVehicle: (id) => request(`/vehicles/${id}`, { method: 'DELETE' }),

  getDrivers: (params = {}) => request(`/drivers?${new URLSearchParams(params)}`),
  createDriver: (dto) => request('/drivers', { method: 'POST', body: dto }),
  updateDriver: (id, dto) => request(`/drivers/${id}`, { method: 'PATCH', body: dto }),
  deleteDriver: (id) => request(`/drivers/${id}`, { method: 'DELETE' }),

  getRequests: (params = {}) => request(`/requests?${new URLSearchParams(params)}`),
  getRequestFormSuggestions: () => request('/requests/form-suggestions'),
  getRequestStats: () => request('/requests/stats'),
  getRequest: (id) => request(`/requests/${id}`),
  getRequestAssignment: (id) => request(`/requests/${id}/assignment`),
  getAssignOptions: (id) => request(`/requests/${id}/assign-options`),
  createRequest: (dto) => request('/requests', { method: 'POST', body: dto }),
  updateRequest: (id, dto) => request(`/requests/${id}`, { method: 'PATCH', body: dto }),
  submitRequest: (id) => request(`/requests/${id}/submit`, { method: 'POST' }),
  cancelRequest: (id) => request(`/requests/${id}`, { method: 'DELETE' }),
  approveRequest: (id) => request(`/requests/${id}/approve`, { method: 'POST' }),
  rejectRequest: (id, rejectionReason) => request(`/requests/${id}/reject`, { method: 'POST', body: { rejectionReason } }),
  assignVehicle: (id, dto) => request(`/requests/${id}/assign`, { method: 'POST', body: dto }),
  reassignDriver: (id, dto) => request(`/requests/${id}/reassign-driver`, { method: 'POST', body: dto }),
  reassignVehicle: (id, dto) => request(`/requests/${id}/reassign-vehicle`, { method: 'POST', body: dto }),
  updateAssignmentNotes: (id, notes) => request(`/requests/${id}/assignment/notes`, { method: 'PATCH', body: { notes } }),
  completeRequest: (id, notes) => request(`/requests/${id}/complete`, { method: 'POST', body: notes !== undefined ? { notes } : {} }),
  overrideRequestStatus: (id, status) => request(`/requests/${id}/status`, { method: 'PATCH', body: { status } }),

  getNotifications: (unreadOnly = false) =>
    request(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
  getUnreadNotificationCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),

  getUsers: () => request('/users'),
  getUser: (id) => request(`/users/${id}`),
  getUserStats: () => request('/users/stats'),
  createUser: (dto) => request('/users', { method: 'POST', body: dto }),
  updateUser: (id, dto) => request(`/users/${id}`, { method: 'PATCH', body: dto }),

  vehicleRegister: () => request('/reports/vehicle-register'),
  requestsByStatus: () => request('/reports/requests-by-status'),
  assignmentHistory: () => request('/reports/assignment-history'),

  getBranches: (activeOnly = false) => request(`/branches?activeOnly=${activeOnly}`),
  createBranch: (dto) => request('/branches', { method: 'POST', body: dto }),
  updateBranch: (id, dto) => request(`/branches/${id}`, { method: 'PATCH', body: dto }),

  getDestinations: (activeOnly = false) => request(`/destinations?activeOnly=${activeOnly}`),
  createDestination: (dto) => request('/destinations', { method: 'POST', body: dto }),
  updateDestination: (id, dto) => request(`/destinations/${id}`, { method: 'PATCH', body: dto }),

  getDepartments: (activeOnly = false) => request(`/departments?activeOnly=${activeOnly}`),
  createDepartment: (dto) => request('/departments', { method: 'POST', body: dto }),
  updateDepartment: (id, dto) => request(`/departments/${id}`, { method: 'PATCH', body: dto }),
};
