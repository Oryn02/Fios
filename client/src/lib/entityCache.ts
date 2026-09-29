/**
 * Tiny localStorage + memory read cache for snappy local-first paint.
 * Used by modules / tasks (and other list surfaces) for stale-while-revalidate.
 */

type CacheEnvelope<T> = {
  v: 1;
  updatedAt: number;
  data: T;
};

const memory = new Map<string, CacheEnvelope<unknown>>();

export function peekEntityCache<T>(key: string): T | null {
  const mem = memory.get(key) as CacheEnvelope<T> | undefined;
  if (mem) return mem.data;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || parsed.v !== 1 || parsed.data == null) return null;
    memory.set(key, parsed as CacheEnvelope<unknown>);
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeEntityCache<T>(key: string, data: T): void {
  const envelope: CacheEnvelope<T> = { v: 1, updatedAt: Date.now(), data };
  memory.set(key, envelope as CacheEnvelope<unknown>);
  try {
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    /* quota / private mode — memory still helps within the session */
  }
}

export function clearEntityCache(key: string): void {
  memory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** In-flight promise dedupe so Overview + Modules + widgets share one network round-trip. */
const inflight = new Map<string, Promise<unknown>>();

export function dedupeAsync<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = factory().finally(() => {
    if (inflight.get(key) === p) inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}
