import { useAuthStore } from '../store/authStore';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';
async function refreshAccess() {
  const { refreshToken, setAccessToken, logout } = useAuthStore.getState();
  if (!refreshToken) return undefined;
  const res = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
  if (!res.ok) { logout(); return undefined; }
  const data = await res.json(); setAccessToken(data.accessToken); return data.accessToken as string;
}
export async function api(path: string, init: RequestInit = {}) {
  const token = useAuthStore.getState().accessToken;
  const headers = { 'Content-Type': 'application/json', ...(init.headers as any), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  let res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401) { const newToken = await refreshAccess(); if (newToken) res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...headers, Authorization: `Bearer ${newToken}` } }); }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Noe gikk galt.');
  const ct = res.headers.get('content-type') ?? ''; return ct.includes('application/json') ? res.json() : res;
}
export const authApi = {
  login: (email: string, password: string) => api('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) }),
  register: (body: any) => api('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  forgot: (email: string) => api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.trim() }) })
};
