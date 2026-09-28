/**
 * IndexedDB offline mutation queue.
 * Enqueues writes while offline and flushes to Supabase when connectivity returns.
 *
 * Guarantees:
 * - Upserts for the same table + conflict key coalesce (no stack of duplicates).
 * - Permanent errors (missing table / schema) dequeue and surface one clear message.
 * - Transient errors use exponential backoff — no infinite retry spam.
 * - schemaMissing pauses cloud writes briefly, then re-probes so sync recovers after
 *   SQL is applied / PostgREST reloads / network returns (no permanent dead sync).
 */

import { supabase } from './supabase';

const DB_NAME = 'fios-offline-queue';
const STORE = 'mutations';
const DB_VERSION = 1;
const MAX_ATTEMPTS = 6;
const BASE_BACKOFF_MS = 4_000;
const MAX_BACKOFF_MS = 5 * 60_000;
/** How long to skip calendar cloud writes after a confirmed missing-table error. */
const SCHEMA_PROBE_COOLDOWN_MS = 45_000;
const STATUS_KEY = 'fios_offline_sync_status';

type OnlineHook = () => void | Promise<void>;
const onlineHooks: OnlineHook[] = [];

export type SyncPhase = 'idle' | 'syncing' | 'error';

export interface SyncStatus {
  phase: SyncPhase;
  pending: number;
  /** User-facing message when phase === 'error' (or last fatal while pending). */
  error: string | null;
  /** True when cloud schema/table is missing — local data still works. */
  schemaMissing: boolean;
  /** ISO time when schemaMissing last flipped true (for probe cooldown). */
  schemaMissingAt: string | null;
  updatedAt: string;
}

type StatusListener = (status: SyncStatus) => void;
const statusListeners = new Set<StatusListener>();

let cachedStatus: SyncStatus = readStoredStatus() || {
  phase: 'idle',
  pending: 0,
  error: null,
  schemaMissing: false,
  schemaMissingAt: null,
  updatedAt: new Date().toISOString(),
};

/** Register extra work to run after the mutation queue flushes on reconnect. */
export function onOfflineQueueOnline(hook: OnlineHook): () => void {
  onlineHooks.push(hook);
  return () => {
    const i = onlineHooks.indexOf(hook);
    if (i >= 0) onlineHooks.splice(i, 1);
  };
}

export interface QueuedMutation {
  id?: number;
  table: string;
  op: 'insert' | 'update' | 'delete' | 'upsert';
  payload: Record<string, unknown>;
  match?: Record<string, unknown>;
  /** Optional onConflict target for upsert (e.g. 'user_id'). */
  onConflict?: string;
  createdAt: string;
  attempts?: number;
  lastError?: string;
  nextAttemptAt?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readStoredStatus(): SyncStatus | null {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SyncStatus>;
    return {
      phase: parsed.phase === 'syncing' || parsed.phase === 'error' ? parsed.phase : 'idle',
      pending: typeof parsed.pending === 'number' ? parsed.pending : 0,
      error: typeof parsed.error === 'string' ? parsed.error : null,
      schemaMissing: Boolean(parsed.schemaMissing),
      schemaMissingAt:
        typeof parsed.schemaMissingAt === 'string'
          ? parsed.schemaMissingAt
          : Boolean(parsed.schemaMissing)
            ? // Legacy sticky flag from v3.1.11 — treat as expired so we re-probe immediately.
              new Date(0).toISOString()
            : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function publishStatus(patch: Partial<SyncStatus>): SyncStatus {
  cachedStatus = {
    ...cachedStatus,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(cachedStatus));
  } catch {
    /* ignore quota */
  }
  for (const listener of [...statusListeners]) {
    try {
      listener(cachedStatus);
    } catch {
      /* ignore */
    }
  }
  return cachedStatus;
}

export function getSyncStatus(): SyncStatus {
  return cachedStatus;
}

export function subscribeSyncStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  listener(cachedStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

export function clearSyncError(): void {
  publishStatus({
    error: null,
    schemaMissing: false,
    schemaMissingAt: null,
    phase: cachedStatus.pending > 0 ? 'syncing' : 'idle',
  });
}

/**
 * True while we recently confirmed a missing table/schema — skip cloud writes briefly
 * to avoid queue spam, but allow periodic re-probes so sync recovers after SQL / network.
 */
export function shouldDeferCloudWrites(table?: string): boolean {
  if (!cachedStatus.schemaMissing) return false;
  if (table && table !== 'calendar_state') return false;
  const at = Date.parse(cachedStatus.schemaMissingAt || '');
  if (Number.isNaN(at)) return false;
  return Date.now() - at < SCHEMA_PROBE_COOLDOWN_MS;
}

function errMessage(err: unknown): string {
  if (!err) return 'Unknown sync error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || 'Unknown sync error';
  const e = err as { message?: string; code?: string; details?: string; hint?: string };
  const parts = [e.message, e.code, e.details, e.hint].filter(Boolean);
  return parts.join(' — ') || 'Unknown sync error';
}

/** Missing relation / PostgREST schema cache / similar non-retryable failures. */
export function isPermanentSchemaError(err: unknown): boolean {
  const msg = errMessage(err).toLowerCase();
  const code = String((err as { code?: string })?.code || '').toUpperCase();
  if (code === 'PGRST205' || code === '42P01' || code === 'PGRST204') return true;
  return (
    msg.includes('could not find the table') ||
    msg.includes('schema cache') ||
    (msg.includes('relation') && msg.includes('does not exist')) ||
    (msg.includes('table') && msg.includes('not find')) ||
    (msg.includes('calendar_state') && (msg.includes('not find') || msg.includes('not exist')))
  );
}

function userFacingSchemaError(table: string): string {
  if (table === 'calendar_state') {
    return 'Timetable cloud sync needs supabase/v3.1.9-calendar-state.sql (then reload PostgREST). Local timetable still works — Fios retries automatically.';
  }
  return `Cloud sync paused — missing database table “${table}”. Local data is kept; Fios will retry.`;
}

/** Call when a live upsert/select proves the cloud table/schema is missing. */
export async function reportPermanentSyncError(table: string, err?: unknown): Promise<void> {
  const message = userFacingSchemaError(table);
  // Drop any queued rows for this table so the banner cannot oscillate.
  try {
    const rows = await listMutations();
    for (const row of rows) {
      if (row.table === table && row.id != null) await removeMutation(row.id);
    }
  } catch {
    /* ignore */
  }
  if (err) console.warn('[offlineQueue] permanent sync error', table, errMessage(err));
  publishStatus({
    phase: 'error',
    error: message,
    schemaMissing: true,
    schemaMissingAt: new Date().toISOString(),
    pending: await listQueuedCount().catch(() => 0),
  });
  scheduleSchemaProbe();
}

function coalesceKey(m: Pick<QueuedMutation, 'table' | 'op' | 'onConflict' | 'payload' | 'match'>): string | null {
  if (m.op === 'upsert' && m.onConflict) {
    const key = m.onConflict;
    const val = m.payload?.[key];
    if (val != null) return `upsert:${m.table}:${key}=${String(val)}`;
  }
  if ((m.op === 'update' || m.op === 'delete') && m.match) {
    const parts = Object.keys(m.match)
      .sort()
      .map((k) => `${k}=${String(m.match![k])}`);
    if (parts.length) return `${m.op}:${m.table}:${parts.join('&')}`;
  }
  return null;
}

async function putMutation(row: QueuedMutation): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(row);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function enqueueMutation(
  mutation: Omit<QueuedMutation, 'id' | 'createdAt'> & { createdAt?: string }
): Promise<void> {
  // Don't keep stacking while schema probe cooldown is active for calendar_state.
  if (shouldDeferCloudWrites(mutation.table)) {
    return;
  }

  const incoming: QueuedMutation = {
    ...mutation,
    createdAt: mutation.createdAt || new Date().toISOString(),
    attempts: 0,
  };

  const key = coalesceKey(incoming);
  if (key) {
    const existing = await listMutations();
    const dup = existing.find((row) => coalesceKey(row) === key);
    if (dup?.id != null) {
      await putMutation({
        ...dup,
        ...incoming,
        id: dup.id,
        attempts: 0,
        lastError: undefined,
        nextAttemptAt: undefined,
      });
      await refreshPendingCount('syncing');
      return;
    }
  }

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(incoming);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  await refreshPendingCount('syncing');
}

async function listMutations(): Promise<QueuedMutation[]> {
  const db = await openDb();
  const rows = await new Promise<QueuedMutation[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedMutation[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows;
}

/** Count pending offline mutations (for network indicator). */
export async function listQueuedCount(): Promise<number> {
  try {
    const rows = await listMutations();
    return rows.length;
  } catch {
    return 0;
  }
}

async function removeMutation(id: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function refreshPendingCount(preferredPhase?: SyncPhase): Promise<number> {
  const pending = await listQueuedCount();
  let phase: SyncPhase = preferredPhase || cachedStatus.phase;
  if (pending === 0 && !cachedStatus.error) phase = 'idle';
  else if (pending === 0 && cachedStatus.error) phase = 'error';
  else if (pending > 0 && phase === 'idle') phase = 'syncing';
  publishStatus({ pending, phase });
  return pending;
}

async function applyMutation(m: QueuedMutation): Promise<void> {
  if (m.op === 'insert') {
    const { error } = await supabase.from(m.table).insert(m.payload);
    if (error) throw error;
    return;
  }
  if (m.op === 'upsert') {
    const opts = m.onConflict ? { onConflict: m.onConflict } : undefined;
    const { error } = await supabase.from(m.table).upsert(m.payload, opts);
    if (error) throw error;
    return;
  }
  if (m.op === 'update') {
    let q = supabase.from(m.table).update(m.payload);
    for (const [k, v] of Object.entries(m.match || {})) {
      q = q.eq(k, v as string | number);
    }
    const { error } = await q;
    if (error) throw error;
    return;
  }
  if (m.op === 'delete') {
    let q = supabase.from(m.table).delete();
    for (const [k, v] of Object.entries(m.match || {})) {
      q = q.eq(k, v as string | number);
    }
    const { error } = await q;
    if (error) throw error;
  }
}

function backoffMs(attempts: number): number {
  const exp = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));
  return exp;
}

let flushInFlight: Promise<{ flushed: number; failed: number; deferred: number }> | null = null;

export async function flushOfflineQueue(): Promise<{
  flushed: number;
  failed: number;
  deferred: number;
}> {
  if (!navigator.onLine) return { flushed: 0, failed: 0, deferred: 0 };
  if (flushInFlight) return flushInFlight;

  flushInFlight = (async () => {
    const items = await listMutations();
    let flushed = 0;
    let failed = 0;
    let deferred = 0;
    const now = Date.now();

    if (items.length > 0) {
      publishStatus({ phase: 'syncing', pending: items.length });
    }

    for (const item of items) {
      if (item.nextAttemptAt) {
        const readyAt = Date.parse(item.nextAttemptAt);
        if (!Number.isNaN(readyAt) && readyAt > now) {
          deferred++;
          continue;
        }
      }

      try {
        await applyMutation(item);
        if (item.id != null) await removeMutation(item.id);
        flushed++;
      } catch (err) {
        const message = errMessage(err);
        console.warn('[offlineQueue] flush failed', item.table, item.op, message);

        if (isPermanentSchemaError(err)) {
          if (item.id != null) await removeMutation(item.id);
          // Drop sibling queued mutations for the same missing table.
          const rest = await listMutations();
          for (const sibling of rest) {
            if (sibling.table === item.table && sibling.id != null) {
              await removeMutation(sibling.id);
            }
          }
          publishStatus({
            phase: 'error',
            error: userFacingSchemaError(item.table),
            schemaMissing: true,
            schemaMissingAt: new Date().toISOString(),
            pending: await listQueuedCount(),
          });
          scheduleSchemaProbe();
          failed++;
          break;
        }

        const attempts = (item.attempts || 0) + 1;
        if (item.id != null) {
          if (attempts >= MAX_ATTEMPTS) {
            await removeMutation(item.id);
            publishStatus({
              phase: 'error',
              error: `Sync stopped after ${MAX_ATTEMPTS} tries: ${message}`,
              pending: await listQueuedCount(),
            });
          } else {
            await putMutation({
              ...item,
              attempts,
              lastError: message,
              nextAttemptAt: new Date(now + backoffMs(attempts)).toISOString(),
            });
            deferred++;
          }
        }
        failed++;
      }
    }

    const pending = await listQueuedCount();
    if (pending === 0 && !cachedStatus.error) {
      publishStatus({ phase: 'idle', pending: 0, error: null });
    } else if (pending === 0 && cachedStatus.error) {
      publishStatus({ phase: 'error', pending: 0 });
    } else if (pending > 0 && !cachedStatus.schemaMissing) {
      publishStatus({ phase: 'syncing', pending });
    } else {
      publishStatus({ pending });
    }

    return { flushed, failed, deferred };
  })();

  try {
    return await flushInFlight;
  } finally {
    flushInFlight = null;
  }
}

let listening = false;
let backoffTimer: number | null = null;
let schemaProbeTimer: number | null = null;

function scheduleBackoffFlush(): void {
  if (typeof window === 'undefined') return;
  if (backoffTimer != null) return;
  backoffTimer = window.setTimeout(() => {
    backoffTimer = null;
    if (!navigator.onLine) return;
    void flushOfflineQueue().then((r) => {
      if (r.deferred > 0) scheduleBackoffFlush();
    });
  }, BASE_BACKOFF_MS);
}

/** After a schema-missing pause, re-run online hooks so calendar sync can recover. */
function scheduleSchemaProbe(): void {
  if (typeof window === 'undefined') return;
  if (schemaProbeTimer != null) {
    window.clearTimeout(schemaProbeTimer);
    schemaProbeTimer = null;
  }
  if (!cachedStatus.schemaMissing) return;
  const at = Date.parse(cachedStatus.schemaMissingAt || '');
  const elapsed = Number.isNaN(at) ? SCHEMA_PROBE_COOLDOWN_MS : Date.now() - at;
  const wait = Math.max(1_000, SCHEMA_PROBE_COOLDOWN_MS - elapsed + 250);
  schemaProbeTimer = window.setTimeout(() => {
    schemaProbeTimer = null;
    if (!navigator.onLine || !cachedStatus.schemaMissing) return;
    // Cooldown expired — allow push/select again.
    void (async () => {
      for (const hook of [...onlineHooks]) {
        try {
          await hook();
        } catch (err) {
          console.warn('[offlineQueue] schema probe hook failed', err);
        }
      }
      const r = await flushOfflineQueue();
      if (r.deferred > 0) scheduleBackoffFlush();
      // Still missing? schedule another probe cycle.
      if (cachedStatus.schemaMissing) scheduleSchemaProbe();
    })();
  }, wait);
}

/** Attach a single `online` listener that flushes the queue. Safe to call repeatedly. */
export function startOfflineQueueListener(): () => void {
  if (listening) return () => {};
  listening = true;
  const onOnline = () => {
    void (async () => {
      const r = await flushOfflineQueue();
      if (r.flushed > 0) console.info(`[offlineQueue] flushed ${r.flushed} mutation(s)`);
      if (r.deferred > 0) scheduleBackoffFlush();
      // Always run reconcile hooks — calendarService re-probes after schema cooldown
      // so sync recovers once SQL exists / PostgREST reloads (no permanent dead sync).
      for (const hook of [...onlineHooks]) {
        try {
          await hook();
        } catch (err) {
          console.warn('[offlineQueue] online hook failed', err);
        }
      }
      // Re-flush in case hooks enqueued fresh work.
      const r2 = await flushOfflineQueue();
      if (r2.deferred > 0) scheduleBackoffFlush();
    })();
  };
  window.addEventListener('online', onOnline);
  if (navigator.onLine) onOnline();
  // Recover sticky schemaMissing from older clients (v3.1.11) on boot.
  if (cachedStatus.schemaMissing) scheduleSchemaProbe();
  return () => {
    window.removeEventListener('online', onOnline);
    if (backoffTimer != null) {
      window.clearTimeout(backoffTimer);
      backoffTimer = null;
    }
    if (schemaProbeTimer != null) {
      window.clearTimeout(schemaProbeTimer);
      schemaProbeTimer = null;
    }
    listening = false;
  };
}
