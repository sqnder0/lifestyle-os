const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed (${res.status})`);
  }

  return res.json();
}

export const api = {
  baseUrl: API_BASE,
  get: (path, token) => request(path, { method: 'GET', token }),
  post: (path, body, token) => request(path, { method: 'POST', body, token }),
  put: (path, body, token) => request(path, { method: 'PUT', body, token }),
  delete: (path, token) => request(path, { method: 'DELETE', token }),
  googleStatus: (token) => request('/google/status', { method: 'GET', token }),
  googleCalendars: (token) => request('/google/calendars', { method: 'GET', token }),
  googleSync: (token, body = {}) => request('/google/sync', { method: 'POST', token, body }),
  googleConnect: (token, body) => request('/google/connect', { method: 'POST', token, body }),
  googleDisconnect: (token) => request('/google/disconnect', { method: 'POST', token }),
  reviews: {
    getAll: (token) => request('/reviews', { method: 'GET', token }),
    save: (token, body) => request('/reviews', { method: 'POST', body, token }),
    update: (token, weekKey, body) => request(`/reviews/${weekKey}`, { method: 'PUT', body, token }),
    delete: (token, weekKey) => request(`/reviews/${weekKey}`, { method: 'DELETE', token }),
  },
};
