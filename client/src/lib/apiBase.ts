/**
 * Resolve absolute API URLs for split Render deploys.
 *
 * - Dev / same-origin: leave `VITE_API_URL` unset → relative `/api/...`
 *   (Vite proxies to Express; Static Site + reverse proxy can also same-origin).
 * - Split services: set `VITE_API_URL` to the Render Web Service origin only,
 *   e.g. `https://fios-akjy.onrender.com` (no trailing slash, no `/api` suffix).
 */
export function getApiOrigin(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '';
  return raw.replace(/\/+$/, '');
}

/** Build a full request URL from an `/api/...` path (or bare path). */
export function apiUrl(path: string): string {
  const origin = getApiOrigin();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const withApi = normalized.startsWith('/api/') || normalized === '/api'
    ? normalized
    : `/api${normalized}`;
  return origin ? `${origin}${withApi}` : withApi;
}
