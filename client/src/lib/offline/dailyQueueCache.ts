/**
 * IndexedDB cache for Daily Queue due cards + pending offline reviews.
 * Separate from calendar offlineQueue.ts — do not merge stores.
 */

import { saasFetch, readJson } from '../../services/saasFetch';
import { onOfflineQueueOnline } from '../offlineQueue';
import { fsrsReview } from '../../services/studyApi';
import { supabase } from '../supabase';

const DB_NAME = 'fios-daily-queue';
const DB_VERSION = 1;
const DUE_STORE = 'dueCards';
const PENDING_STORE = 'pendingReviews';
const META_KEY = 'meta';

export interface CachedDueCard {
  id: string;
  question: string;
  answer: string;
  next_review: string | null;
  scheduler?: string;
  deck_id: string;
  decks?: { title?: string } | null;
  [key: string]: unknown;
}

export interface PendingReview {
  id?: number;
  cardId: string;
  rating: 1 | 2 | 3 | 4;
  durationMs?: number;
  /** Local SM-2 snapshot to push if FSRS unavailable. */
  sm2?: {
    ease_factor: number;
    interval: number;
    repetitions: number;
    next_review: string;
  };
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DUE_STORE)) {
        db.createObjectStore(DUE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheDueCards(cards: CachedDueCard[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([DUE_STORE, 'meta'], 'readwrite');
    const store = tx.objectStore(DUE_STORE);
    store.clear();
    for (const c of cards) store.put(c);
    tx.objectStore('meta').put({ key: META_KEY, updatedAt: new Date().toISOString(), count: cards.length });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function readCachedDueCards(): Promise<CachedDueCard[]> {
  try {
    const db = await openDb();
    const rows = await new Promise<CachedDueCard[]>((resolve, reject) => {
      const tx = db.transaction(DUE_STORE, 'readonly');
      const req = tx.objectStore(DUE_STORE).getAll();
      req.onsuccess = () => resolve((req.result as CachedDueCard[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rows;
  } catch {
    return [];
  }
}

export async function enqueuePendingReview(review: Omit<PendingReview, 'id'>): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    tx.objectStore(PENDING_STORE).add(review);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listPendingReviews(): Promise<PendingReview[]> {
  try {
    const db = await openDb();
    const rows = await new Promise<PendingReview[]>((resolve, reject) => {
      const tx = db.transaction(PENDING_STORE, 'readonly');
      const req = tx.objectStore(PENDING_STORE).getAll();
      req.onsuccess = () => resolve((req.result as PendingReview[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rows;
  } catch {
    return [];
  }
}

async function clearPendingByIds(ids: number[]): Promise<void> {
  if (!ids.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_STORE);
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Flush pending offline reviews to the server.
 * Prefers /api/study/offline-sync; falls back to per-card FSRS or direct Supabase SM-2.
 */
export async function flushPendingReviews(): Promise<{ flushed: number; errors: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { flushed: 0, errors: 0 };
  }
  const pending = await listPendingReviews();
  if (!pending.length) return { flushed: 0, errors: 0 };

  // Batch sync when available
  try {
    const res = await saasFetch('/api/study/offline-sync', {
      method: 'POST',
      body: JSON.stringify({
        reviews: pending.map((p) => ({
          cardId: p.cardId,
          rating: p.rating,
          durationMs: p.durationMs,
          sm2: p.sm2,
          createdAt: p.createdAt,
        })),
      }),
    });
    if (res.ok) {
      await readJson(res).catch(() => ({}));
      await clearPendingByIds(pending.map((p) => p.id!).filter((id) => typeof id === 'number'));
      return { flushed: pending.length, errors: 0 };
    }
  } catch {
    /* fall through to per-item */
  }

  let flushed = 0;
  let errors = 0;
  const doneIds: number[] = [];

  for (const p of pending) {
    try {
      if (p.sm2) {
        const { error } = await supabase
          .from('cards')
          .update({
            ease_factor: p.sm2.ease_factor,
            interval: p.sm2.interval,
            repetitions: p.sm2.repetitions,
            next_review: p.sm2.next_review,
          })
          .eq('id', p.cardId);
        if (error) throw error;
      } else {
        await fsrsReview(p.cardId, p.rating, p.durationMs);
      }
      flushed += 1;
      if (typeof p.id === 'number') doneIds.push(p.id);
    } catch {
      errors += 1;
    }
  }
  await clearPendingByIds(doneIds);
  return { flushed, errors };
}

let flushHookRegistered = false;

/** Register flush on reconnect via the shared offline queue online hook. */
export function ensureDailyQueueFlushHook(): void {
  if (flushHookRegistered) return;
  flushHookRegistered = true;
  onOfflineQueueOnline(() => {
    void flushPendingReviews();
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      void flushPendingReviews();
    });
  }
}
