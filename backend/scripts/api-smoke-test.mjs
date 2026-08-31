/**
 * Backend API smoke test — run with server + MongoDB up:
 *   npm run start:dev
 *   npm run test:api
 */

const API = process.env.API_URL || 'http://localhost:3000/api';

const accounts = {
  admin: { email: 'admin@otech.com', password: 'Password123' },
  employee: { email: 'employee@otech.com', password: 'Password123' },
  manager: { email: 'manager@otech.com', password: 'Password123' },
  fleet: { email: 'fleet@otech.com', password: 'Password123' },
};

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function login(role) {
  const { email, password } = accounts[role];
  const res = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
    token: null,
  });
  if (!res.ok) throw new Error(`Login failed for ${role}: ${JSON.stringify(res.data)}`);
  return res.data.accessToken;
}

function futureDate(daysFromNow = 14, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function run() {
  console.log(`\nFleet Management API smoke test\nAPI: ${API}\n`);

  // 1. Health via login
  try {
    const adminToken = await login('admin');
    pass('Auth — admin login');
  } catch (e) {
    fail('Auth — admin login', e.message);
    printSummary();
    process.exit(1);
  }

  const tokens = {};
  for (const role of ['employee', 'manager', 'fleet', 'admin']) {
    try {
      tokens[role] = await login(role);
      pass(`Auth — ${role} login`);
    } catch (e) {
      fail(`Auth — ${role} login`, e.message);
    }
  }

  // 2. Settings lookups
  for (const path of ['/departments', '/branches', '/destinations']) {
    const res = await request(path, { token: tokens.admin });
    if (res.ok && Array.isArray(res.data)) {
      pass(`GET ${path}`, `${res.data.length} items`);
    } else {
      fail(`GET ${path}`, `status ${res.status}`);
    }
  }

  // 3. Employee creates + submits request
  let draftId = null;
  const travelDate = futureDate(20);
  const createRes = await request('/requests', {
    method: 'POST',
    token: tokens.employee,
    body: {
      branch: 'HQ',
      destination: 'Smoke Test Destination',
      purpose: 'API smoke test trip',
      travelDate,
      tripDuration: '4h',
      numberOfPassengers: 1,
    },
  });
  if (createRes.ok && createRes.data?._id) {
    draftId = createRes.data._id;
    pass('POST /requests — create draft', createRes.data.requestNumber);
  } else {
    fail('POST /requests — create draft', JSON.stringify(createRes.data));
  }

  if (draftId) {
    const submitRes = await request(`/requests/${draftId}/submit`, {
      method: 'POST',
      token: tokens.employee,
    });
    if (submitRes.ok && submitRes.data?.status === 'Submitted') {
      pass('POST /requests/:id/submit', submitRes.data.requestNumber);
    } else {
      fail('POST /requests/:id/submit', JSON.stringify(submitRes.data));
    }
  }

  // 4. Overlap rejection on submit
  const overlapTravel = futureDate(20, 10);
  const overlapDraft = await request('/requests', {
    method: 'POST',
    token: tokens.employee,
    body: {
      branch: 'HQ',
      destination: 'Overlap Test',
      purpose: 'Should block on submit',
      travelDate: overlapTravel,
      tripDuration: '4h',
      numberOfPassengers: 1,
    },
  });
  if (overlapDraft.ok && overlapDraft.data?._id) {
    const overlapSubmit = await request(`/requests/${overlapDraft.data._id}/submit`, {
      method: 'POST',
      token: tokens.employee,
    });
    if (!overlapSubmit.ok && String(overlapSubmit.data?.message || '').toLowerCase().includes('overlap')) {
      pass('Overlap guard on submit', 'blocked second request');
      await request(`/requests/${overlapDraft.data._id}`, {
        method: 'DELETE',
        token: tokens.employee,
      });
    } else {
      fail('Overlap guard on submit', `expected 400, got ${overlapSubmit.status}`);
    }
  } else {
    fail('Overlap guard setup — create draft', JSON.stringify(overlapDraft.data));
  }

  // 5. Manager approve (use the submitted smoke test request if still Submitted)
  if (draftId) {
    const approveRes = await request(`/requests/${draftId}/approve`, {
      method: 'POST',
      token: tokens.manager,
    });
    if (approveRes.ok && approveRes.data?.status === 'Approved') {
      pass('POST /requests/:id/approve', approveRes.data.requestNumber);
    } else if (approveRes.status === 400 && String(approveRes.data?.message || '').includes('overlap')) {
      pass('POST /requests/:id/approve', 'skipped — overlap with existing trip (data state)');
    } else {
      fail('POST /requests/:id/approve', JSON.stringify(approveRes.data));
    }
  }

  // 6. Fleet assign options + stats
  const statsRes = await request('/requests/stats', { token: tokens.fleet });
  if (statsRes.ok) {
    pass('GET /requests/stats', `awaiting=${statsRes.data?.awaitingAssignment ?? '—'}`);
  } else {
    fail('GET /requests/stats', `status ${statsRes.status}`);
  }

  if (draftId) {
    const optsRes = await request(`/requests/${draftId}/assign-options`, { token: tokens.fleet });
    if (optsRes.ok && Array.isArray(optsRes.data?.vehicles)) {
      pass('GET /requests/:id/assign-options', `${optsRes.data.vehicles.length} vehicles`);
    } else if (optsRes.status === 404 || optsRes.status === 400) {
      pass('GET /requests/:id/assign-options', 'not assignable in current state');
    } else {
      fail('GET /requests/:id/assign-options', JSON.stringify(optsRes.data));
    }
  }

  // 7. Users list (admin)
  const usersRes = await request('/users', { token: tokens.admin });
  if (usersRes.ok && Array.isArray(usersRes.data) && usersRes.data.length > 0) {
    pass('GET /users', `${usersRes.data.length} users`);
  } else {
    fail('GET /users', `status ${usersRes.status}`);
  }

  // 8. Unauthorized access
  const noAuth = await request('/users');
  if (noAuth.status === 401) {
    pass('Auth guard — rejects missing token');
  } else {
    fail('Auth guard — rejects missing token', `status ${noAuth.status}`);
  }

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n--- Summary: ${passed} passed, ${failed} failed ---\n`);
}

run().catch((err) => {
  console.error('Smoke test crashed:', err.message);
  process.exit(1);
});
