// Read-only make.fun client. Responses are reused in memory and revalidated once per minute with ETags.
const ORIGIN = 'https://make.fun';
const API = `${ORIGIN}/api`;
const memory = new Map();
const minute = () => Math.floor(Date.now() / 60000);
const keyFor = (path) => `fieldwork:${path}`;

function stored(path) {
  if (memory.has(path)) return memory.get(path);
  try {
    const value = JSON.parse(sessionStorage.getItem(keyFor(path)) || 'null');
    if (value?.data) memory.set(path, value);
    return value;
  } catch { return null; }
}

function remember(path, value) {
  memory.set(path, value);
  try { sessionStorage.setItem(keyFor(path), JSON.stringify(value)); } catch { /* storage is optional */ }
}

async function request(path, attempt = 0) {
  const cached = stored(path);
  if (cached?.minute === minute()) return cached.data;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const headers = cached?.etag ? { 'If-None-Match': cached.etag } : {};
    const response = await fetch(API + path, { headers, signal: controller.signal, mode: 'cors' });
    if (response.status === 304 && cached) {
      remember(path, { ...cached, minute: minute() });
      return cached.data;
    }
    if ((response.status === 429 || response.status === 503) && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 650 * (attempt + 1)));
      return request(path, attempt + 1);
    }
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json()).detail || ''; } catch { /* use status below */ }
      throw new Error(detail || `make.fun returned ${response.status}`);
    }
    const data = await response.json();
    remember(path, { data, etag: response.headers.get('etag'), minute: minute() });
    return data;
  } catch (error) {
    if (cached?.data && error.name !== 'AbortError') return cached.data;
    if (error.name === 'AbortError') throw new Error('The live data request timed out.');
    throw error;
  } finally { clearTimeout(timer); }
}

export const api = {
  bounties: () => request('/competitions?status=open&activity=times'),
  bounty: (slug) => request(`/competitions/${encodeURIComponent(slug)}`),
  leaderboard: (slug) => request(`/competitions/${encodeURIComponent(slug)}/leaderboard?rows=first&ties=runs`),
  profile: (handle) => request(`/profiles/${encodeURIComponent(handle)}`),
};
