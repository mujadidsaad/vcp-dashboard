/**
 * Tiny wrapper around localStorage with:
 *   - JSON serialization
 *   - a namespaced key
 *   - a version number that invalidates old blobs when the schema changes
 *
 * We deliberately use localStorage (not sessionStorage) so results survive a
 * full page refresh and even browser restart. Users can wipe them with the
 * Clear / Rescan button in the UI.
 */

const NAMESPACE = 'vcp-dashboard';

interface Envelope<T> {
  v: number;
  t: number;     // millis-since-epoch of when it was saved
  data: T;
}

export function loadState<T>(key: string, version: number): { data: T; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(`${NAMESPACE}:${key}`);
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (!env || env.v !== version) return null;
    return { data: env.data, savedAt: env.t };
  } catch {
    return null;
  }
}

export function saveState<T>(key: string, version: number, data: T): void {
  try {
    const env: Envelope<T> = { v: version, t: Date.now(), data };
    localStorage.setItem(`${NAMESPACE}:${key}`, JSON.stringify(env));
  } catch (e) {
    // Quota / private mode: log but don't crash.
    console.warn('[persist] failed to save', key, e);
  }
}

export function clearState(key: string): void {
  try { localStorage.removeItem(`${NAMESPACE}:${key}`); } catch { /* ignore */ }
}

/** Formats a savedAt timestamp as "just now", "5m ago", "2h ago", "3d ago". */
export function timeAgo(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const diff = Date.now() - ms;
  if (diff < 45_000)          return 'just now';
  if (diff < 3_600_000)       return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 24 * 3_600_000)  return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / (24 * 3_600_000))}d ago`;
}