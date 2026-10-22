let rawBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
// Remove any trailing slash
rawBase = rawBase.replace(/\/+$/, '');
// Ensure it ends with /api if user didn't include it
if (!rawBase.endsWith('/api')) {
  rawBase += '/api';
}
const BASE = rawBase;

export const getToken = () => localStorage.getItem('pp_token');
export const setToken = (t) => (t ? localStorage.setItem('pp_token', t) : localStorage.removeItem('pp_token'));

export const getUserRole = () => localStorage.getItem('pp_role') || '';
export const setUserRole = (r) => (r ? localStorage.setItem('pp_role', r) : localStorage.removeItem('pp_role'));

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }
  let payload;
  if (form) {
    payload = form; // the browser sets the multipart/form-data boundary automatically
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(BASE + path, { method, headers, body: payload });
  if (res.status === 401 && path !== '/auth/login') {
    setToken(null);
    setUserRole(null);
    if (!window.location.pathname.startsWith('/consent/')) {
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const d = await res.json();
      msg = d.detail || msg;
    } catch (e) {}
    throw new Error(msg);
  }

  return res.json();
}
