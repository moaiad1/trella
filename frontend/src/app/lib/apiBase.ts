/**
 * Resolves API base URL. If VITE_API_BASE_URL points at the server root without
 * `/api` (e.g. http://127.0.0.1:8000), appends `/api` so routes like /trucks work.
 */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL ?? "/api";
  const trimmed = raw.replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }
  return trimmed || "/api";
}
