/**
 * IndexedDB offline mutation queue.
 * Enqueues writes while offline and flushes to Supabase when connectivity returns.
 */

import { supabase } from './supabase';

const DB_NAME = 'fios-offline-queue';
const STORE = 'mutations';
const DB_VERSION = 1;

export interface QueuedMutation {
  id?: number;
  table: string;
  op: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  match?: Record<string, unknown>;
  createdAt: string;
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

export async function enqueueMutation(
  mutation: Omit<QueuedMutation, 'id' | 'createdAt'> & { createdAt?: string }
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({
      ...mutation,
      createdAt: mutation.createdAt || new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
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

async function applyMutation(m: QueuedMutation): Promise<void> {
  if (m.op === 'insert') {
    const { error } = await supabase.from(m.table).insert(m.payload);
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

export async function flushOfflineQueue(): Promise<{ flushed: number; failed: number }> {
  if (!navigator.onLine) return { flushed: 0, failed: 0 };
  const items = await listMutations();
  let flushed = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await applyMutation(item);
      if (item.id != null) await removeMutation(item.id);
      flushed++;
    } catch (err) {
      console.warn('[offlineQueue] flush failed', item, err);
      failed++;
    }
  }
  return { flushed, failed };
}

let listening = false;

/** Attach a single `online` listener that flushes the queue. Safe to call repeatedly. */
export function startOfflineQueueListener(): () => void {
  if (listening) return () => {};
  listening = true;
  const onOnline = () => {
    void flushOfflineQueue().then((r) => {
      if (r.flushed > 0) console.info(`[offlineQueue] flushed ${r.flushed} mutation(s)`);
    });
  };
  window.addEventListener('online', onOnline);
  if (navigator.onLine) onOnline();
  return () => {
    window.removeEventListener('online', onOnline);
    listening = false;
  };
}
