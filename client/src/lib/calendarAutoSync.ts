/**
 * Background iCal auto-sync — keep Unified Agenda the live source of truth.
 * Polls the saved feed on an interval + when the tab becomes visible / online.
 */
import {
  fetchAndParseCalendar,
  getSavedCalendarUrl,
  type CalendarEvent,
} from './calendarService';
import { loadScheduleMeta, peekSavedCalendarUrl } from './scheduleService';

const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'fios_ical_last_auto_sync';

type Listener = (events: CalendarEvent[], meta: { fromCache: boolean; at: string }) => void;

const listeners = new Set<Listener>();
let timer: number | null = null;
let inFlight: Promise<CalendarEvent[] | null> | null = null;
let started = false;

function lastSyncAt(): number {
  try {
    return Number(sessionStorage.getItem(STORAGE_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

function markSync() {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function subscribeCalendarAutoSync(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function runCalendarAutoSync(opts?: { force?: boolean }): Promise<CalendarEvent[] | null> {
  const meta = loadScheduleMeta();
  if (meta.mode === 'manual') return null;

  const now = Date.now();
  if (!opts?.force && now - lastSyncAt() < MIN_INTERVAL_MS) {
    return null;
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      let url = peekSavedCalendarUrl();
      if (!url) url = (await getSavedCalendarUrl()) || '';
      if (!url) return null;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

      const events = await fetchAndParseCalendar(url);
      markSync();
      const at = new Date().toISOString();
      listeners.forEach((fn) => {
        try {
          fn(events, { fromCache: false, at });
        } catch {
          /* ignore listener errors */
        }
      });
      return events;
    } catch (err) {
      console.warn('[calendarAutoSync]', err);
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function onVisibility() {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    void runCalendarAutoSync();
  }
}

function onOnline() {
  void runCalendarAutoSync({ force: true });
}

/** Idempotent — call once from App bootstrap. */
export function ensureCalendarAutoSync(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  void runCalendarAutoSync({ force: true });
  timer = window.setInterval(() => void runCalendarAutoSync(), MIN_INTERVAL_MS);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onOnline);
}

export function stopCalendarAutoSync(): void {
  if (!started) return;
  started = false;
  if (timer != null) {
    window.clearInterval(timer);
    timer = null;
  }
  document.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener('online', onOnline);
}
